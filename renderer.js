// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {shell, ipcRenderer, clipboard} = require( "electron" )
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

var copyButton = document.getElementById( "copyButton" )

copyButton.addEventListener( "click", ( e, ev ) => clipboard.writeText( times.value ) )

var folderRegex = /(\d+)-(\d+)-(\d+)_(\d+)-(\d+)-(\d+)/g;
var clipRegex = /(\d+)-(\d+)-(\d+)_(\d+)-(\d+)-(.*).mp4/g;

ipcRenderer.on( "folders", ( event, folders ) =>
{
	var specialFolders = [ "TeslaCam", "SavedClips", "RecentClips" ]
	var rawFolders = [ "RecentClips" ]
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
				var match = folderRegex.exec( folder )
			
				folderRegex.lastIndex = 0
			
				if ( match && match.length > 0 )
				{
					function addFolder( match )
					{
						var date = helpers.extractDate( match, hasSeconds = true )
						var folderPath = path.join( baseFolder, folder )
				
						folderInfos.push( { date: date, path: folderPath, recent: false } )
					}

					addFolder( match )
				}
				else
				{
					var clipMatch = clipRegex.exec( folder )

					clipRegex.lastIndex = 0

					if ( clipMatch && clipMatch.length > 0 )
					{
						var date = helpers.extractDate( clipMatch, hasSeconds = false )
						var existing = folderInfos.find( i => i.path == baseFolder )

						if ( existing )
						{
							if ( date > existing.date ) existing.date = date
						}
						else
						{
							folderInfos.push( { date: date, path: baseFolder, recent: true } )
						}
					}
				}
			}
		}
	}

	addSubfolders( folders[ 0 ] )

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

		if ( timeValues )
		{
			for ( var time of timeValues )
			{
				var name = time.date.toString()

				if ( time.recent ) name += "(Recent)"

				times.options[ times.options.length ] = new Option( name, time.path )
			}
		}

		if ( times.options.length > 0 )
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

function deleteClips( dateTime, views, deleteDiv )
{
	if ( confirm( `Are you sure you want to delete clips from ${dateTime}?` ) )
	{
		for ( var view of views ) fs.unlinkSync( view.file )

		var folderPath = path.dirname( views[ 0 ].file )
		var files = fs.readdirSync( folderPath )

		if ( files.length < 1 ) fs.rmdirSync( folderPath )

		deleteDiv.parentNode.removeChild( deleteDiv )
	}
}

var selectedFolderElement = null

function loadFolder( folder, folderElement )
{
//	if ( selectedFolderElement ) selectedFolderElement.classList.remove( "selected" )

//	selectedFolderElement = folderElement
//	selectedFolderElement.classList.add( "selected" )

	var page = document.getElementById( "page" )

	function raiseDirty() { page.dispatchEvent( new Event( "dirty" ) ) }

	page.addEventListener( "scroll", ( e, ev ) => raiseDirty() )
	window.addEventListener( "resize", ( e, ev ) => raiseDirty() )

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
			var match = clipRegex.exec( file )

			clipRegex.lastIndex = 0

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
			function addVideosForTime( dateTime, views )
			{
				var div = helpers.addElement( element, "div", { class: "timespan" } )
				var container = helpers.addElement( div, "div", { class: "titleContainer" } )
				var controlsContainer = helpers.addElement( container, "div", { class: "controls" } )
				var title = helpers.addElement( container, "div", { class: "title", title: "Show / hide" } )
				var videoContainer = helpers.addElement( div, "div", { class: "container" } )

				title.innerText = dateTime

				title.addEventListener( "click", ( e, ev ) =>
				{
					videoContainer.style.display = ( videoContainer.style.display != "none" ) ? "none" : "block"
					raiseDirty()
				} )

				function ensureVideos()
				{
					if ( videoContainer.hasChildNodes() ) return true
					if ( !helpers.isInViewport( videoContainer ) ) return false

					function addVideo( className )
					{
						var column = helpers.addElement( videoContainer, "div", { class: "column" } )
						var video = helpers.addElement( column, "video", { class: className, preload: "metadata", title: "Show in file manager" } )

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
								video[ 0 ].setAttribute( "src", view.file + "#t=0.03" )
								video[ 0 ].addEventListener( "click", ( e, ev ) => shell.showItemInFolder( view.file ) )
							}
						}

						assignVideo( view )
					}

					helpers.addControls(
						controlsContainer,
						videos,
						( e, ev ) => clipboard.writeText( views[ 0 ].file ),
						( e, ev ) => deleteClips( dateTime, views, div ) )

					return true
				}

				if ( !ensureVideos() )
				{
					page.addEventListener( "dirty", ( e, ev ) => ensureVideos() )
				}
			}

			addVideosForTime( dateTime, views )
		}
	} )
}
