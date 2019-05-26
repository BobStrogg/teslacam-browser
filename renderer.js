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

var page = $( "#page" )
var videosElement = $( "#videos" )

function raiseDirty() { page.trigger( "dirty" ) }

page.on( "scroll", ( e, ev ) => raiseDirty() )
$( window ).on( "resize", ( e, ev ) => raiseDirty() )

var version = $ ( "#version" )

version.innerText = app.getVersion()

var openButton = $( "#openButton" )

var status = $( "#status" )
var times = $( "#times" )

times.on( "change", ( e, ev ) => loadFolder( e.target.value, videosElement ) )

var copyButton = $( "#copyButton" )

copyButton.on( "click", ( e, ev ) => clipboard.writeText( times.value ) )

openButton.on( "click", ( e, ev ) =>
{
	var folders = dialog.showOpenDialog( { properties: [ "openDirectory" ] } )
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

	ipcRenderer.send( "folders",
	{
		version: app.getVersion(),
		folders: folders,
		folderInfos: folderInfos,
		dateGroups: Array.from( dateGroups ),
		dates: dates
	} )

	function labelValue( label, value )
	{
		return `<span class="label">${label}:</span> <span class="value">${value}</span>`
	}

	status.html( `${labelValue( "Events", folderInfos.length )} ${labelValue( "Days", dates.length ) }` )

	var calendar = $( "#calendar" )

	function setTimes( date )
	{
		times.empty()

		var timeValues = dateGroups.get( date.toDateString() )

		if ( timeValues )
		{
			for ( var time of timeValues )
			{
				var name = time.date.toString()

				if ( time.recent ) name += "(Recent)"

				times.append( $( new Option( name, time.path ) ) )
			}
		}

		if ( times.length > 0 )
		{
			loadFolder( times.first().val(), videosElement )
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

function loadFolder( folder, container )
{
	fs.readdir( folder, ( err, dir ) =>
	{
		helpers.loadFolder( folder, dir, container )
	} )
}
