// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {shell, ipcRenderer} = require( "electron" )
const os = require( "os" )
const fs = require( "fs" )
const path = require( "path" )
const flatpickr = require( "flatpickr" )
const helpers = require( "./renderer-helpers" )
const { dialog, app } = require( "electron" ).remote

var version = document.getElementById( "version" )

version.innerText = app.getVersion()

var openButton = document.getElementById( "openButton" )

openButton.addEventListener( "click", ( e, ev ) => ipcRenderer.send( "selectFolders" ) )

var status = document.getElementById( "status" )
var times = document.getElementById( "times" )

times.addEventListener( "change", ( e, ev ) => loadFolder( e.target.value ) )

ipcRenderer.on( "folders", ( event, folders ) =>
{
	var folderRegex = /(\d+)-(\d+)-(\d+)_(\d+)-(\d+)-(\d+)/g;

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
					//var folderElement = helpers.addElement( foldersElement, "div", { class: "folder" } )
					//var folderTitle = helpers.addElement( folderElement, "div", { class: "title" } )
					var folderPath = path.join( baseFolder, folder )
			
					//folderTitle.innerText = date
					//folderTitle.addEventListener( "click", ( e, ev ) => loadFolder( folderPath, folderElement  ) )

					folderInfos.push( { date: date, path: folderPath } )
				}

				addFolder( match )
			}
		}

		var dateGroups = helpers.groupBy( folderInfos, g => g.date.toDateString() )
		var dates = Array.from( dateGroups.keys() ).map( d => new Date( d ) )

		function labelValue( label, value )
		{
			return `<span class="label">${label}:</span> <span class="value">${value}</span>`
		}

		status.innerHTML = `${labelValue( "Events", folderInfos.length )} ${labelValue( "Days", dates.length ) }`

		var calendar = document.getElementById( "calendar" )

		function setTimes( date )
		{
			times.options.length = 0

			var timeValues = dateGroups.get( date.toDateString() )

			for ( var time of timeValues )
			{
				times.options[ times.options.length ] = new Option( time.date, time.path )
			}

			if ( times.length > 0 )
			{
				loadFolder( times.options[ 0 ].value )
			}
		}

		flatpickr(
			calendar,
			{
				onChange: d => setTimes( d[ 0 ] ),
				enable: dates
			} )
	} )
} )

var selectedFolderElement = null

function loadFolder( folder, folderElement )
{
	var regex = /(\d+)-(\d+)-(\d+)_(\d+)-(\d+)-(.*).mp4/g;

//	if ( selectedFolderElement ) selectedFolderElement.classList.remove( "selected" )

//	selectedFolderElement = folderElement
//	selectedFolderElement.classList.add( "selected" )

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
				var container = helpers.addElement( div, "div", { class: "titleContainer" } )
				var controlsContainer = helpers.addElement( container, "div", { class: "controls" } )
				var title = helpers.addElement( container, "div", { class: "title", title: "Show in file manager" } )

				title.innerText = dateTime
				title.addEventListener( "click", ( e, ev ) => shell.showItemInFolder( views[ 0 ].file ) )

				var videoContainer = helpers.addElement( div, "div", { class: "container" } )

				function addVideo( className )
				{
					var column = helpers.addElement( videoContainer, "div", { class: "column"} )
					var video = helpers.addElement( column, "video", { class: className, title: "Show in file manager" } )

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
					function assignVideo( view )
					{
						var video = videoContainer.getElementsByClassName( view.camera )

						if ( video && video.length > 0 )
						{
							video[ 0 ].setAttribute( "src", view.file )
							video[ 0 ].addEventListener( "click", ( e, ev ) => shell.showItemInFolder( view.file ) )
						}
					}

					assignVideo( view )
				}

				helpers.addControls( controlsContainer, videos )
			}

			addVideos( views )
		}
	} )
}
