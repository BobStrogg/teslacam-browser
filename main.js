// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain, shell, clipboard } = require( "electron" )
const menu = require( "./menu" )
const helpers = require( "./helpers" )
const { autoUpdater } = require( "electron-updater" )
const settings = require( "electron-settings" )
const fs = require( "fs" )
const path = require( "path" )
const express = require( "express" )
const serveIndex = require( "serve-index" )

autoUpdater.checkForUpdatesAndNotify()

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow()
{
	// Create the browser window.
	mainWindow = new BrowserWindow(
	{
		width: 1000,
		height: 700,
		webPreferences:
		{
			nodeIntegration: true
		}
	} )

	// and load the index.html of the app.
	mainWindow.loadFile( "index.html" )

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()

	// Emitted when the window is closed.
	mainWindow.on( "closed", function ()
	{
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null
	} )

	menu.initialize( () => selectFolders( mainWindow.webContents ) )

	initialize()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on( "ready", createWindow )

// Quit when all windows are closed.
app.on( "window-all-closed", function ()
{
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if ( process.platform !== 'darwin' ) app.quit()
} )

app.on( "activate", function ()
{
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if ( mainWindow === null ) createWindow()
} )

function initialize()
{
	function openFolder( folders )
	{
		var specialFolders = [ "TeslaCam", "SavedClips", "RecentClips" ]
		var folderInfos = []

		function addSubfolders( baseFolder )
		{
			var subfolders = fs.readdirSync( baseFolder )

			for ( var folder of subfolders )
			{
				if ( specialFolders.includes( folder ) )
				{
					addSubfolders( path.join( baseFolder, folder ) )
				}
				else
				{
					var match = helpers.matchFolder( folder )
				
					if ( match && match.length > 0 )
					{
						function addFolder( match )
						{
							var date = helpers.extractDate( match )
							var folderPath = path.join( baseFolder, folder )
							var relative = path.relative( folders[ 0 ], folderPath )
					
							folderInfos.push( { date: date, path: folderPath, relative: relative, recent: false } )
						}

						addFolder( match )
					}
					else
					{
						var clipMatch = helpers.matchClip( folder )

						if ( clipMatch && clipMatch.length > 0 )
						{
							var date = helpers.extractDate( clipMatch )
							var existing = folderInfos.find( i => i.path == baseFolder )

							if ( existing )
							{
								if ( date > existing.date ) existing.date = date
							}
							else
							{
								var relative = path.relative( folders[ 0 ], baseFolder )

								folderInfos.push( { date: date, path: baseFolder, relative: relative, recent: true } )
							}
						}
					}
				}
			}
		}

		if ( folders && folders.length > 0 ) addSubfolders( folders[ 0 ] )

		var dateGroups = helpers.groupBy( folderInfos, g => g.date.toDateString() )
		var dates = Array.from( dateGroups.keys() ).map( d => new Date( d ) )

		return {
			folders: folders,
			folderInfos: folderInfos,
			dateGroups: Array.from( dateGroups ),
			dates: dates
		}
	}

	const expressApp = express()
	const port = 8088

	var lastArgs = null

	function open()
	{
		var folders = dialog.showOpenDialog( { properties: [ "openDirectory" ] } )

		settings.set( "folders", folders )

		return openFolders( folders )
	}

	function openFolders( folders )
	{
		lastArgs = openFolder( folders )
		lastArgs.version = app.getVersion()

		var folders = lastArgs.folders

		if ( folders && folders.length > 0 )
		{
			console.log( `Serving content from ${folders[ 0 ]}` )

			expressApp.use(
				"/videos",
				express.static( folders[ 0 ] ),
				serveIndex( folders[ 0 ], { 'icons': true } ) )
		}

		return lastArgs
	}

	function args()
	{
		return lastArgs = lastArgs || { version: app.getVersion() }
	}

	function browse()
	{
		console.log( `Opening browser at http://localhost:${port}` )
		shell.openExternal( `http://localhost:${port}` )
	}

	function deleteFiles( files )
	{
		console.log( `Deleting files: ${files}` )

		for ( var file of files ) fs.unlinkSync( file )

		console.log( `Deleted files: ${files}` )

		var folderPath = path.dirname( files[ 0 ] )
		var files = fs.readdirSync( folderPath )

		if ( files.length < 1 )
		{
			console.log( `Deleting folder: ${folderPath}` )

			fs.rmdirSync( folderPath )

			console.log( `Deleted folder: ${folderPath}` )
		}
	}

	function copyFilePaths( filePaths )
	{
		clipboard.writeText( filePaths.map( f => `"${path.join( lastArgs.folders[ 0 ], f )}"` ).join( " " ) ) 
	}

	function deleteFolder( folder )
	{
		var folderPath = path.join( lastArgs.folders[ 0 ], folder )

		console.log( `Deleting folder: ${folderPath}` )

//		fs.rmdirSync( folderPath )

		console.log( `Deleted folder: ${folderPath}` )
	}

	function copyPath( folderPath )
	{
		clipboard.writeText( path.join( lastArgs.folders[ 0 ], folderPath ) )
	}

	function openExternal( path )
	{
		shell.showItemInFolder( path )
	}

	var lastFolders = settings.get( "folders" )

	//If we have last folders, we need to make sure that the folder still exists before trying to open it
	if ( lastFolders )
	{
		fs.stat( `${lastFolders}`, function(err)
		{
			if ( !err )
			{
				console.log('Opening Last Folders');
				openFolders( lastFolders )
			}
			else if ( err.code === 'ENOENT' )
			{
				console.log( `Last folders: '${lastFolders}' doesn't exist anymore` );
			}
		});
	} 

	expressApp.get( "/", ( request, response ) => response.sendFile( __dirname + "/external.html" ) )
	expressApp.get( "/open", ( request, response ) => response.send( open() ) )
	expressApp.get( "/args", ( request, response ) => response.send( args() ) )

	expressApp.post( "/browse", ( request, response ) => browse() )
	expressApp.post( "/deleteFiles", ( request, response, files ) => deleteFiles( files ) )
	expressApp.post( "/copyFilePaths", ( request, response, filePaths ) => copyFilePaths( filePaths ) )
	expressApp.post( "/deleteFolder", ( request, response, folder ) => deleteFolder( folder ) )
	expressApp.post( "/copyPath", ( request, response, path ) => copyPath( path ) )
	expressApp.post( "/openExternal", ( request, response, path ) => openExternal( path ) )

	expressApp.use( "/files", ( request, response ) =>
	{
		var folder = lastArgs.folders[ 0 ] + "/" + request.path

		console.log( `Serving file listing from ${folder}` )

		response.send( fs.readdirSync( folder ) )
	} )

	expressApp.use( "/content", express.static( __dirname ) )
	expressApp.use( "/node_modules", express.static( __dirname + "/node_modules" ) )

	ipcMain.on( "args", event => event.returnValue = args() )
	ipcMain.on( "open", event => event.returnValue = open() )
	ipcMain.on( "browse", event => browse() )
	ipcMain.on( "deleteFiles", ( event, files ) => deleteFiles( files ) )
	ipcMain.on( "copyFilePaths", ( event, filePaths ) => copyFilePaths( filePaths ) )
	ipcMain.on( "deleteFolder", ( event, folder ) => deleteFolder( folder ) )
	ipcMain.on( "copyPath", ( event, path ) => copyPath( path ) )
	ipcMain.on( "openExternal", ( event, path ) => openExternal( path ) )

	expressApp.listen( port, ( err ) =>
	{
		if (err)
		{
			return console.log( `something bad happened`, err)
		}

		console.log( `Server is listening on ${port}` )
	} )
}
