import { execFile } from 'node:child_process';
import { lstat, mkdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const phases = ['before', 'action', 'after'];
const tracks = ['referenceSeconds', 'webProgress', 'videoSeconds'];

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(field + ' must be nonempty text.');
  }
}

function validateTrack(track, field, maximum) {
  if (!object(track)) throw new Error(field + ' must contain before, action and after markers.');
  for (const phase of phases) {
    const at = track[phase];
    if (!Number.isFinite(at) || at < 0 || at > maximum) {
      const bounds = maximum === 1 ? 'a number between 0 and 1' : 'nonnegative seconds';
      throw new Error(field + '.' + phase + ' must be ' + bounds + '.');
    }
  }
  if (!(track.before < track.action && track.action < track.after)) {
    throw new Error(field + ' markers must increase from before to action to after.');
  }
}

export async function readEventLedger(path) {
  const text = await readFile(path, 'utf8');
  const ledger = JSON.parse(text.replace(/^\uFEFF/, ''));
  if (!object(ledger) || ledger.version !== 1 || !Array.isArray(ledger.events) || !ledger.events.length) {
    throw new Error('Expected a version 1 ledger with at least one event.');
  }

  if (ledger.reference !== undefined) {
    if (!object(ledger.reference)) throw new Error('reference must be an object.');
    for (const field of ['source', 'observed', 'transfer', 'redesign']) {
      requireText(ledger.reference[field], 'reference.' + field);
    }
    if (ledger.reference.inferred !== undefined) requireText(ledger.reference.inferred, 'reference.inferred');
  }

  const ids = new Set();
  for (const [index, event] of ledger.events.entries()) {
    if (!object(event) || typeof event.id !== 'string' || !/^[a-z][a-z0-9-]{0,62}$/.test(event.id)) {
      throw new Error('events[' + index + '].id must start with a letter and contain lowercase letters, digits or hyphens.');
    }
    if (ids.has(event.id)) throw new Error('Duplicate event ID: ' + event.id);
    ids.add(event.id);

    if (!object(event.expected)) throw new Error(event.id + '.expected must contain all three phase descriptions.');
    for (const phase of phases) requireText(event.expected[phase], event.id + '.expected.' + phase);

    if (event.webProgress === undefined && event.videoSeconds === undefined) {
      throw new Error(event.id + ' must supply webProgress or videoSeconds.');
    }
    for (const track of tracks) {
      if (event[track] !== undefined) {
        validateTrack(event[track], event.id + '.' + track, track === 'webProgress' ? 1 : Infinity);
      }
    }
  }
  return ledger;
}

export function markersFor(ledger, track) {
  if (!tracks.includes(track)) throw new Error('Unknown event track: ' + track);
  return ledger.events.filter(event => event[track] !== undefined).flatMap(event =>
    phases.map(phase => ({
      eventId: event.id,
      phase,
      at: event[track][phase],
      expected: event.expected[phase],
    })),
  );
}

async function media(program, args) {
  try {
    const result = await run(program, args, { encoding: 'utf8', windowsHide: true });
    return result.stdout;
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(program + ' is unavailable on PATH.');
    throw new Error(program + ' failed. ' + (error.stderr?.trim() || error.message));
  }
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function extractFrames(ledger, track, inputPath, outputPath) {
  const markers = markersFor(ledger, track);
  if (!markers.length) throw new Error('No events have ' + track + ' markers.');

  const input = resolve(inputPath);
  const output = resolve(outputPath);
  if (!(await stat(input)).isFile()) throw new Error('The video input must be a local file.');
  const info = JSON.parse(await media('ffprobe', [
    '-v', 'error', '-protocol_whitelist', 'file', '-select_streams', 'v:0',
    '-show_entries', 'stream=index,duration:format=duration', '-of', 'json', input,
  ]));
  const duration = [info.format?.duration, info.streams?.[0]?.duration]
    .map(Number).find(value => Number.isFinite(value) && value > 0);
  if (!info.streams?.length || duration === undefined) {
    throw new Error('Could not verify a video stream and its duration.');
  }

  const frames = markers.map(marker => ({
    ...marker,
    file: marker.eventId + '-' + marker.phase + '.png',
  }));
  for (const frame of frames) {
    if (frame.at >= duration) {
      throw new Error(frame.file + ' is at or beyond the video duration of ' + duration + ' seconds.');
    }
    if (await exists(join(output, frame.file))) {
      throw new Error('Frame already exists: ' + join(output, frame.file));
    }
  }

  await mkdir(output, { recursive: true });
  for (const frame of frames) {
    const filename = join(output, frame.file);
    await media('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-n',
      '-protocol_whitelist', 'file', '-ss', String(frame.at), '-i', input,
      '-map', '0:v:0', '-frames:v', '1', '-update', '1', filename,
    ]);
    if (!(await exists(filename)) || (await stat(filename)).size === 0) {
      throw new Error('No decoded frame at ' + frame.at + ' seconds for ' + frame.file + '.');
    }
  }
  return {
    track,
    output,
    duration,
    frames,
    skippedEvents: ledger.events.filter(event => event[track] === undefined).map(event => event.id),
  };
}

async function main(args) {
  const [command, path, track, input, output] = args;
  if (command === 'validate' && args.length === 2) {
    const ledger = await readEventLedger(path);
    const counts = Object.fromEntries(tracks.map(name => [name, markersFor(ledger, name).length]));
    console.log(JSON.stringify({ events: ledger.events.length, markers: counts }, null, 2));
    return;
  }
  if (command === 'frames' && args.length === 5 && ['referenceSeconds', 'videoSeconds'].includes(track)) {
    console.log(JSON.stringify(await extractFrames(await readEventLedger(path), track, input, output), null, 2));
    return;
  }
  throw new Error('Usage: event-ledger.mjs validate <ledger.json> or frames <ledger.json> <referenceSeconds|videoSeconds> <video> <output-dir>');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
