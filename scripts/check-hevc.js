const { app, BrowserWindow, ipcMain } = require( "electron" )
const http = require( "http" )
const fs = require( "fs" )
const path = require( "path" )

const probeScript = `
(function () {
  var report = (typeof hevc !== "undefined")
    ? hevc.detect()
    : (function () {
        var video = document.createElement("video");
        var types = [
          'video/mp4; codecs="hvc1.1.6.L93.B0"',
          'video/mp4; codecs="hev1.1.6.L93.B0"',
          'video/mp4; codecs="hvc1"',
          'video/mp4; codecs="hev1"',
          'video/mp4; codecs="avc1.42E01E"'
        ];
        return {
          supported: null,
          hevc: types.map(function (type) {
            var mediaSource = false;
            try { mediaSource = !!(window.MediaSource && MediaSource.isTypeSupported(type)); } catch (e) {}
            return { type: type, canPlayType: video.canPlayType(type) || "", mediaSource: mediaSource };
          })
        };
      })();
  report.page = location.href;
  report.hasTeslacamBridge = typeof window.teslacam === "object" && window.teslacam !== null;
  report.nodeExposed = typeof require === "function";
  report.banner = (document.querySelector(".alert-warning") || {}).textContent || "";
  return report;
})()
`

function createWindow( preload )
{
	return new BrowserWindow(
	{
		show: false,
		webPreferences:
		{
			preload: preload,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true
		}
	} )
}

function serve( root )
{
	const server = http.createServer( ( request, response ) =>
	{
		var urlPath = decodeURIComponent( request.url.split( "?" )[ 0 ] )

		if ( urlPath === "/" ) urlPath = "/external.html"

		var filePath = path.join( root, urlPath.replace( /^\/content\//, "/" ).replace( /^\/node_modules\//, "/node_modules/" ) )

		if ( urlPath.startsWith( "/content/" ) ) filePath = path.join( root, urlPath.slice( "/content".length ) )

		fs.readFile( filePath, ( error, body ) =>
		{
			if ( error )
			{
				response.writeHead( 404 )
				response.end( "missing" )
				return
			}

			response.writeHead( 200 )
			response.end( body )
		} )
	} )

	return new Promise( resolve =>
	{
		server.listen( 0, "127.0.0.1", () => resolve( server ) )
	} )
}

const emptyArgs =
{
	version: "hevc-check",
	folder: "",
	dates: [],
	dateGroups: [],
	folderInfos: [],
	subfolders: [],
	folderPathParts: []
}

ipcMain.on( "openFolders", event => { event.returnValue = emptyArgs } )
ipcMain.on( "reopenFolders", event => { event.returnValue = emptyArgs } )
ipcMain.on( "openFolder", event => { event.returnValue = emptyArgs } )
ipcMain.on( "getFiles", event => { event.returnValue = { clips: [], event: null } } )
ipcMain.on( "openBrowser", () => {} )
ipcMain.on( "deleteFiles", () => {} )
ipcMain.on( "deleteFolder", () => {} )
ipcMain.on( "copyFilePaths", () => {} )
ipcMain.on( "copyPath", () => {} )
ipcMain.on( "openExternal", () => {} )

app.whenReady().then( async () =>
{
	const desktop = createWindow( path.join( __dirname, "..", "preload.js" ) )

	await desktop.loadFile( path.join( __dirname, "..", "index.html" ) )
	const desktopReport = await desktop.webContents.executeJavaScript( probeScript )

	const server = await serve( path.join( __dirname, ".." ) )
	const browser = createWindow( undefined )

	await browser.loadURL( "http://127.0.0.1:" + server.address().port + "/" )
	const browserReport = await browser.webContents.executeJavaScript( probeScript )

	const report =
	{
		versions: process.versions,
		platform: process.platform,
		arch: process.arch,
		desktop: desktopReport,
		browser: browserReport
	}

	process.stdout.write( JSON.stringify( report, null, 2 ) + "\n" )
	server.close()
	app.exit( 0 )
} ).catch( error =>
{
	console.error( error )
	app.exit( 1 )
} )
