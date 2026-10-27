const assert = require( "assert" )
const fs = require( "fs" )
const os = require( "os" )
const path = require( "path" )
const helpers = require( "../helpers" )
const hevc = require( "../hevc" )
const services = require( "../services" )

function writeClip( dir, name )
{
	fs.mkdirSync( dir, { recursive: true } )
	fs.writeFileSync( path.join( dir, name ), "" )
}

const root = fs.mkdtempSync( path.join( os.tmpdir(), "teslacam-" ) )
const sentry = path.join( root, "TeslaCam", "SentryClips", "2024-05-01_12-00-00" )
const track = path.join( root, "TeslaCam", "TrackMode", "2024-05-02_08-15-30" )

writeClip( sentry, "2024-05-01_11-59-00-front.mp4" )
writeClip( sentry, "2024-05-01_11-59-00-left_repeater.mp4" )
writeClip( sentry, "2024-05-01_11-59-00-right_pillar.mp4" )
writeClip( sentry, "2024-05-01_11-59-00-back.mp4" )
writeClip( sentry, "2024-05-01_11-59-00-cabin.mp4" )
fs.writeFileSync( path.join( sentry, "event.json" ), JSON.stringify(
{
	reason: "sentry_aware_object_detection",
	city: "Example",
	est_lat: "37.0",
	est_lon: "-122.0",
	timestamp: "2024-05-01T19:00:00Z"
} ) )
writeClip( track, "2024-05-02_08-14-00-front.mp4" )
fs.writeFileSync( path.join( sentry, "event.json.bak" ), "{" )

services.setFolder( root )
const opened = services.openFolder( root )

assert.strictEqual( opened.folderInfos.length, 2 )
const sentryInfo = opened.folderInfos.find( info => info.category === "Sentry" )
const trackInfo = opened.folderInfos.find( info => info.category === "Track" )

assert.ok( sentryInfo, "SentryClips should be labeled Sentry" )
assert.strictEqual( sentryInfo.event.reason, "sentry_aware_object_detection" )
assert.ok( trackInfo, "TrackMode should be labeled Track" )
assert.strictEqual( trackInfo.event, null )

const files = services.getFiles( sentryInfo.relative, filePath => filePath )
const cameras = files.clips[ 0 ][ 1 ].map( clip => clip.camera ).sort()

assert.deepStrictEqual( cameras, [ "back", "cabin", "front", "left_repeater", "right_pillar" ] )
assert.strictEqual( files.event.city, "Example" )

const broken = path.join( root, "TeslaCam", "SavedClips", "2024-06-01_00-00-00" )
writeClip( broken, "2024-06-01_00-00-00-front.mp4" )
fs.writeFileSync( path.join( broken, "event.json" ), "{not json" )
const saved = services.openFolder( root ).folderInfos.find( info => info.category === "Saved" )

assert.ok( saved )
assert.strictEqual( saved.event, null )
assert.strictEqual( services.getFiles( saved.relative, filePath => filePath ).event, null )

const removed = services.deleteFolder( saved.relative )

assert.strictEqual( fs.existsSync( broken ), false )
assert.strictEqual( services.deleteFiles( null ), undefined )
assert.strictEqual( services.deleteFiles( {} ), undefined )
assert.ok( removed === undefined )

const reopened = services.reopenFolders()

assert.ok( reopened.folderInfos.some( info => info.category === "Sentry" ) )
assert.ok( !reopened.folderInfos.some( info => info.category === "Saved" ) )

const recentDay = path.join( root, "TeslaCam", "RecentClips", "2024-07-04" )
writeClip( recentDay, "2024-07-04_01-02-03-front.mp4" )
writeClip( path.join( root, "TeslaCam", "RecentClips", "not-a-date" ), "2024-07-04_01-02-03-back.mp4" )

const withRecent = services.openFolder( root )
const recentInfo = withRecent.folderInfos.find( info => info.category === "Recent" && info.relative.indexOf( "2024-07-04" ) >= 0 )

assert.ok( recentInfo, "date-only RecentClips folders should be scanned" )
assert.ok( !withRecent.folderInfos.some( info => info.relative.indexOf( "not-a-date" ) >= 0 ) )

const recentFiles = services.getFiles( recentInfo.relative, filePath => filePath )

assert.strictEqual( recentFiles.clips[ 0 ][ 1 ][ 0 ].camera, "front" )

const positive = hevc.detect(
{
	canPlayType: type => type.indexOf( "hvc1" ) >= 0 ? "probably" : "",
	isTypeSupported: () => false
} )

assert.strictEqual( positive.supported, true )
assert.strictEqual( positive.message, "" )

const negative = hevc.detect(
{
	canPlayType: type => type.indexOf( "avc1" ) >= 0 ? "probably" : "",
	isTypeSupported: () => false
} )

assert.strictEqual( negative.supported, false )
assert.ok( negative.message.indexOf( "HEVC" ) >= 0 )
assert.strictEqual( negative.avc.canPlayType, "probably" )
assert.ok( negative.hevc.every( result => result.canPlayType === "" && result.mediaSource === false ) )

const maybeOnly = hevc.detect(
{
	canPlayType: () => "maybe",
	isTypeSupported: () => false
} )

assert.strictEqual( maybeOnly.supported, false )
assert.strictEqual( maybeOnly.maybe, true )

const folderMatch = helpers.matchFolder( "2024-05-01_12-00-00" )
const clipMatch = helpers.matchClip( "2024-05-01_11-59-00-cabin.mp4" )

assert.strictEqual( folderMatch.groups.s, "00" )
assert.strictEqual( clipMatch.groups.c, "cabin" )

services.setFolder( "" )
const empty = services.openFolder( "" )

assert.strictEqual( empty.folder, "" )
assert.deepStrictEqual( empty.folderInfos, [] )

console.log( "library tests passed" )
