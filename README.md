# TeslaCam Browser

Local browser for TeslaCam archives on a computer. Tesla's own Dashcam Viewer (in the car, and in the mobile app over Premium Connectivity) is the easier way to watch a recent clip while the car is around. This project is for the USB or SD card after you pull it: a whole archive, offline, with every camera on one screen.

Plug the drive in, or point the app at a copy of the `TeslaCam` folder. Clips are grouped on a calendar. Playback keeps the cameras in sync, and clicking a video opens the file on disk.

## Where this still helps

- **Offline archive.** The drive does not need to be in the car, and nothing is streamed through Premium Connectivity or a data cap.
- **Several cameras at once.** Left, front, right, back, and cabin stay side by side, share one scrubber, and can play at 1x, 2x, or 10x. Shorter clips wait so the others stay lined up.
- **A big disk, not one event.** Open SavedClips, SentryClips, RecentClips, or TrackMode and move through days. Copy a folder path into [tesla_dashcam](https://github.com/ehendrix23/tesla_dashcam) when you want a merged file. Delete clips from the drive after you confirm.
- **event.json next to the pictures.** Sentry events show the trigger reason, city, and a map link from the file on disk.
- **A machine on the network.** `node server.js` or the Docker image serves the same UI. That is the path for a NAS or a Pi sitting next to the drive. Linux still cannot decode HEVC in Chrome or Electron; use a Mac or Windows browser for those files, or merge them with tesla_dashcam.

Watching the latest event in the car or in the phone app is enough for a lot of people. This app does not replace that.

## Features

- Dashcam, Sentry, and Track Mode folders, including RecentClips stored under a `YYYY-MM-DD` directory
- Repeater and pillar camera names, plus front, back, and cabin, wrapped three across
- Calendar navigation and a Saved / Sentry / Recent / Track label on each event
- Sentry `event.json` (reason, city, map link, timestamp)
- Combined or per-clip playback, scrubbing, and speed
- Desktop app and a headless server on port 8088

## Installation

Packages, when cut, are on the [Releases](https://github.com/BobStrogg/teslacam-browser/releases) page. macOS builds are universal (Apple Silicon and Intel). Code signing stays in the builder's environment. Do not commit an `.env` or a certificate.

The desktop shell is Electron 45 (Chromium 156). It does not run on macOS Big Sur 11.

## Running from the command line

```
cd teslacam-browser
yarn install
yarn start
```

## Running as a headless server

```
cd teslacam-browser
yarn install
node server.js /path/to/TeslaCam
```

Open http://localhost:8088 . On another machine, use the server's address instead of `localhost`.

Docker, including arm64 hosts (the base image publishes both architectures):

```
docker build -t teslacam-browser .
docker run --rm -p 8088:8088 -v /path/to/TeslaCam:/media/TeslaCam teslacam-browser
```

## HEVC / H.265

HW3 and later firmware store HEVC. The page asks `canPlayType` and `MediaSource.isTypeSupported` for `hvc1` and `hev1`. If the answer is no, a warning is shown instead of a blank player, and a clip that fails to decode shows the same explanation.

Measured on Linux x64 with Electron 45.1.0 (Chromium 156.0.8078.49), in the desktop window and in the server page loaded in that same Chromium:

| Type | canPlayType | MediaSource.isTypeSupported |
| --- | --- | --- |
| `video/mp4; codecs="hvc1.1.6.L93.B0"` | empty | false |
| `video/mp4; codecs="hev1.1.6.L93.B0"` | empty | false |
| `video/mp4; codecs="hvc1"` | empty | false |
| `video/mp4; codecs="hev1"` | empty | false |
| `video/mp4; codecs="avc1.42E01E"` (H.264) | probably | true |

Linux builds of Chrome and Electron do not ship an HEVC decoder, so those clips stay blank there. Chromium uses the operating system's decoder where it has one: VideoToolbox on macOS (Apple Silicon and Intel Macs with HEVC hardware), and Media Foundation on Windows when the HEVC Video Extensions are installed. Those two platforms were not booted in this environment, so that part is Chromium's platform-decoder behavior, not a local playback test. Safari on macOS and Edge on Windows remain the browsers to try from the Browse button. There is no ffmpeg transcode step in this app.

## tesla_dashcam

1. Select the date and event folder
2. Click "Copy path"
3. `tesla_dashcam "<paste_folder_here>"`

## License

[CC0 1.0 (Public Domain)](LICENSE.md)
