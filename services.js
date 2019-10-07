( function ( root, factory )
{
	if ( typeof define === 'function' && define.amd ) define( [ "./helpers", "fs", "path", "express", "serve-index" ], factory );
	else if ( typeof exports === 'object' ) module.exports = factory( require( "./helpers" ), require( "fs" ), require( "path" ), require( "express" ), require( "serve-index" ) );
	else root.services = factory( root.helpers, root.fs, root.path, root.express, root.serveIndex );
}( typeof self !== 'undefined' ? self : this, function ( helpers, fs, path, express, serveIndex )
{
	const expressApp = express()
	var version = "0.0.1"
	var lastArgs = { version: version, folder: "" }

    function setVersion( v )
    {
		version = v
		lastArgs.version = v
		console.log( "TeslaCam Browser version set to " + v )
    }

	function setFolder( f )
	{
		lastArgs.folder = f
		console.log( "Root folder set to " + f )
	}

	function reopenFolders()
	{
		return lastArgs ? openFolders( lastArgs.folders ) : lastArgs
	}

	function openFolders( folders )
	{
		if ( folders && folders.length > 0 )
		{
            var folder = folders[ 0 ] + "/"

            Object.assign( lastArgs, openFolder( folder ) )

			console.log( `OBSOLETE?: Serving content from ${folder}` )

			expressApp.use(
				"/videos",
				express.static( folder ),
				serveIndex( folder, { 'icons': true } ) )
		}

		return lastArgs
	}

	function args()
	{
		return lastArgs
	}

	function getFiles( p, getVideoPath )
	{
		var folder = path.join( lastArgs.folder, p )
		var files = fs.readdirSync( folder )

		return Array.from( helpers.groupFiles( p, files, getVideoPath ) )
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

	function deleteFolder( folder )
	{
		var folderPath = path.join( lastArgs.folders[ 0 ], folder )
		var files = fs.readdirSync( folderPath )

		deleteFiles( files.map( f => path.join( folderPath, f ) ) )
	}

	function copyFilePaths( filePaths )
	{
		return filePaths.map( f => `"${path.join( lastArgs.folder, f )}"` ).join( " " )
	}

	function copyPath( folderPath )
	{
		return path.join( lastArgs.folder, folderPath )
	}

	function openFolder( folder )
	{
		if ( !folder ) folder = lastArgs.folder

		var specialFolders = [ "TeslaCam", "SavedClips", "RecentClips", "TeslaSentry" ]
		var folderInfos = []

		function addSubfolders( baseFolder )
		{
			try
			{
				var subfolders = fs.readdirSync( baseFolder )

				for ( var subfolder of subfolders )
				{
					if ( specialFolders.includes( subfolder ) )
					{
						addSubfolders( path.join( baseFolder, subfolder ) )
					}
					else
					{
						var match = helpers.matchFolder( subfolder )
					
						if ( match && match.length > 0 )
						{
							function addFolder( match )
							{
								var date = helpers.extractDate( match )
								var folderPath = path.join( baseFolder, subfolder )
								var relative = path.relative( folder, folderPath )
						
								folderInfos.push( { date: date, path: folderPath, relative: relative, recent: false } )
							}

							addFolder( match )
						}
						else
						{
							var clipMatch = helpers.matchClip( subfolder )

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
									var relative = path.relative( folder, baseFolder )

									folderInfos.push( { date: date, path: baseFolder, relative: relative, recent: true } )
								}
							}
						}
					}
				}
			}
			catch
			{
			}
		}

		folder = path.normalize( ( folder || "" ) + path.sep )

		addSubfolders( folder )

		var dateGroups = helpers.groupBy( folderInfos, g => g.date.toDateString() )
		var dates = Array.from( dateGroups.keys() ).map( d => new Date( d ) )
		var parsedFolder = path.parse( folder )

		var folderNames = [ parsedFolder.root ]
			.concat( parsedFolder.dir.replace( parsedFolder.root, "" ).split( path.sep ) )
			.concat( [ parsedFolder.base ] )
			.filter( f => f.length > 0 )

		var folderPathParts = folderNames
			.map( ( f, i ) => { return { path: path.join( ...folderNames.slice( 0, i + 1 ) ), name: f } } )

		//console.log( parsedFolder )
		//console.log( folderNames )
		//console.log( folderPathParts )

		function isDirectory( p )
		{
			try
			{
				return fs.lstatSync( p ).isDirectory()
			}
			catch
			{
				return false
			}
		}

		var subfolders = []

		try
		{
			subfolders = fs.readdirSync( folder )
				.map( f => { return { path: path.join( folder, f ), name: f } } )
				.filter( f => isDirectory( f.path ) )
		}
		catch
		{
		}

		return {
			folder: folder,
			folderInfos: folderInfos,
			dateGroups: Array.from( dateGroups ),
            dates: dates,
            parsedFolder: parsedFolder,
			folderPathParts: folderPathParts,
			subfolders: subfolders,
			version: version
        }
    }

    function initializeExpress( port )
    {
		function serveVideos( args )
		{
			lastArgs = args

			console.log( ` ${args.folder}` )

			expressApp.use(
				"/videos",
				express.static( args.folder ),
				serveIndex( args.folder, { 'icons': true } ) )

			return args
		}

        expressApp.get( "/", ( request, response ) => response.sendFile( __dirname + "/external.html" ) )
        expressApp.get( "/openFolders", ( request, response ) => response.send( openFolders() ) )
        expressApp.get( "/reopenFolders", ( request, response ) => response.send( reopenFolders() ) )
        expressApp.get( "/args", ( request, response ) => response.send( args() ) )
        expressApp.get( "/openDefaultFolder", ( request, response ) => response.send( serveVideos( openFolder() ) ) )
        expressApp.use( "/openFolder", ( request, response ) => response.send( serveVideos( openFolder( decodeURIComponent( request.path ) ) ) ) )
        expressApp.use( "/copyFilePaths", ( request, response ) => response.send( copyFilePaths( decodeURIComponent( request.path ) ) ) )
        expressApp.use( "/copyPath", ( request, response ) => response.send( copyPath( decodeURIComponent( request.path ) ) ) )
        expressApp.use( "/files", ( request, response ) => response.send( getFiles( decodeURIComponent( request.path ), p => "videos/" + p ) ) )

        expressApp.post( "/deleteFiles", ( request, response ) => deleteFiles( request.body ) )
        expressApp.post( "/deleteFolder", ( request, response ) => deleteFolder( request.body ) )

        expressApp.use( "/content", express.static( __dirname ) )
        expressApp.use( "/node_modules", express.static( __dirname + "/node_modules" ) )

        expressApp.listen( port, ( err ) =>
        {
            if (err)
            {
                return console.log( `Something bad happened`, err )
            }
    
            console.log( `Server is listening on port ${port}` )
        } )
    }

	return {
		setVersion: setVersion,
		setFolder: setFolder,
        openFolders: openFolders,
        reopenFolders: reopenFolders,
        openFolder: openFolder,
		args: args,
		getFiles: getFiles,
        deleteFiles: deleteFiles,
        copyFilePaths: copyFilePaths,
        deleteFolder: deleteFolder,
        copyPath: copyPath,
        initializeExpress: initializeExpress,
        openFolder: openFolder
	}
} ) );
