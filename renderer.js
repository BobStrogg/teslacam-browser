// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {shell, ipcRenderer} = require( "electron" )
const os = require( "os" )
const fs = require( "fs" )
const path = require( "path" )
const flatpickr = require( "flatpickr" )
const helpers = require( "./renderer-helpers" )
const { dialog } = require( "electron" ).remote

var openButton = document.getElementById( "openButton" )

openButton.addEventListener( "click", ( e, ev ) => ipcRenderer.send( "selectFolders" ) )

ipcRenderer.on( "folders", ( event, folders ) =>
{
	var folderRegex = /(\d+)-(\d+)-(\d+)_(\d+)-(\d+)-(\d+)/g;
	var regex = /(\d+)-(\d+)-(\d+)_(\d+)-(\d+)-(.*).mp4/g;

	var foldersElement = document.getElementById( "folders" )
	var baseFolder = folders[ 0 ]

	fs.readdir( baseFolder, ( err, dir ) =>
	{
		var folderInfos = []
	
		for ( var folder of dir )
		{
			var match = folderRegex.exec( folder )
		
			folderRegex.lastIndex = 0
		
			if ( match && match.length > 0 )
			{
				function addFolder( match )
				{
					var date = helpers.extractDate( match, hasSeconds = true )
					var folderElement = helpers.addElement( foldersElement, "div", { class: "folder" } )
					var folderTitle = helpers.addElement( folderElement, "div", { class: "title" } )
					var folderPath = path.join( baseFolder, folder )
			
					folderTitle.innerText = date
					folderTitle.addEventListener( "click", ( e, ev ) => loadFolder( folderPath, folderElement  ) )

					folderInfos.push( date )
				}

				addFolder( match )
			}
		}

		var dateGroups = helpers.groupBy( folderInfos, g => g.toDateString() )
		var dates = Array.from( dateGroups.keys() ).map( d => new Date( d ) )

		var calendar = document.getElementById( "calendar" )

		flatpickr( calendar, { enable: dates } )
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
					var date = helpers.extractDate( match )
					var camera = match[ 6 ]
					var filePath = path.join( folder, file )

					files.push( { date: date, camera: camera, file: filePath } )
				}
			}

			var grouped = helpers.groupBy( files, f => f.date.toString() )

			for ( var [ dateTime, views ] of grouped )
			{
				function addVideos( views )
				{
					var div = helpers.addElement( element, "div", { class: "timespan" } )
					var title = helpers.addElement( div, "h3", { class: "title" } )

					title.innerText = dateTime

					var videoContainer = helpers.addElement( div, "div", { class: "container" } )

					function addVideo( className )
					{
						var column = helpers.addElement( videoContainer, "div", { class: "column" } )
						var video = helpers.addElement( column, "video", { class: className } )

						return video
					}

					var videos =
					[
						addVideo( "left_repeater" ),
						addVideo( "front" ),
						addVideo( "right_repeater" )
					]

					var end = helpers.addElement( videoContainer, "div", { class: "end" } )

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
