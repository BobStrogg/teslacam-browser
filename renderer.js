// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {shell, ipcRenderer} = require( "electron" )
const os = require( "os" )
const fs = require( "fs" )
const path = require( "path" )
const flatpickr = require( "flatpickr" )
const regexHelpers = require( "./regex-helpers" )
const { dialog } = require( "electron" ).remote

ipcRenderer.on( "folders", ( event, folders ) =>
{
	var folderRegex = /(\d+)-(\d+)-(\d+)_(\d+)-(\d+)-(\d+)/g;
	var regex = /(\d+)-(\d+)-(\d+)_(\d+)-(\d+)-(.*).mp4/g;

	function groupBy( list, keyGetter )
	{
		const map = new Map();

		list.forEach( ( item ) =>
		{
			const key = keyGetter( item );
			const collection = map.get( key );

			if ( !collection ) map.set( key, [ item ] );
			else collection.push(item);
		});

		return map;
	}

	function extractDate( match, hasSeconds = false )
	{
		var year = Number( match[ 1 ] )
		var month = Number( match[ 2 ] ) - 1
		var day = Number( match[ 3 ] )
		var hour = Number( match[ 4 ] )
		var minute = Number( match[ 5 ] )
		var second = hasSeconds ? Number( match[ 6 ] ) : 0

		return new Date( year, month, day, hour, minute, second )
	}

	function addElement( container, name, attributes )
	{
		var element = document.createElement( name )

		container.appendChild( element )

		if ( attributes )
		{
			for ( var key in attributes ) element.setAttribute( key, attributes[ key ] )
		}

		return element
	}

	var foldersElement = document.getElementById( "folders" )
	var baseFolder = folders[ 0 ]

	fs.readdir( baseFolder, ( err, dir ) =>
	{
		for ( var folder of dir )
		{
			var match = folderRegex.exec( folder )
		
			folderRegex.lastIndex = 0
		
			if ( match && match.length > 0 )
			{
				function addFolder( match )
				{
					var date = extractDate( match, hasSeconds = true )
					var folderElement = addElement( foldersElement, "div", { class: "folder" } )
					var folderTitle = addElement( folderElement, "div", { class: "title" } )
					var folderPath = path.join( baseFolder, folder )
			
					folderTitle.innerText = date
					folderTitle.addEventListener( "click", ( e, ev ) => loadFolder( folderPath, folderElement  ) )
				}

				addFolder( match )
			}
		}    
	} )

	var selectedFolderElement = null

	function loadFolder( folder, folderElement )
	{
		if ( selectedFolderElement ) selectedFolderElement.classList.remove( "selected" )

		selectedFolderElement = folderElement
		selectedFolderElement.classList.add( "selected" )

		var element = document.getElementById( "videos" )

		while ( element.firstChild )
		{
			element.removeChild( element.firstChild )
		}

		fs.readdir( folder, ( err, dir ) =>
		{
			var files = []

			for ( var file of dir )
			{
				var match = regex.exec( file )

				regex.lastIndex = 0

				if ( match && match.length > 0 )
				{
					var date = extractDate( match )
					var camera = match[ 6 ]
					var filePath = path.join( folder, file )

					files.push( { date: date, camera: camera, file: filePath } )
				}
			}

			var grouped = groupBy( files, f => f.date.toString() )

			for ( var [ dateTime, views ] of grouped )
			{
				function addVideos( views )
				{
					var div = addElement( element, "div", { class: "timespan" } )
					var title = addElement( div, "h3", { class: "title" } )

					title.innerText = dateTime

					var videoContainer = addElement( div, "div", { class: "container" } )

					function addVideo( className )
					{
						var column = addElement( videoContainer, "div", { class: "column" } )
						var video = addElement( column, "video", { class: className } )

						return video
					}

					var videos =
					[
						addVideo( "left_repeater" ),
						addVideo( "front" ),
						addVideo( "right_repeater" )
					]

					var end = addElement( videoContainer, "div", { class: "end" } )

					for ( var view of views )
					{
						var video = videoContainer.getElementsByClassName( view.camera )

						if ( video && video.length > 0 )
						{
							video[ 0 ].setAttribute( "src", view.file )
						}
					}

					title.addEventListener( "click", ( e, ev ) => { for ( var v of videos ) { console.log( v ); v.play() } } )
				}

				addVideos( views )
			}
		} )
	}
} )
