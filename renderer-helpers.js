( function ( root, factory )
{
	if ( typeof define === 'function' && define.amd ) define( [], factory );
	else if ( typeof exports === 'object' ) module.exports = factory();
	else root.helpers = factory();
}( typeof self !== 'undefined' ? self : this, function ()
{
	const folderRegex = /(?<y>\d+)-(?<m>\d+)-(?<d>\d+)_(?<h>\d+)-(?<mm>\d+)(?:-(?<s>\d+))?$/g;
	const clipRegex = /(?<y>\d+)-(?<m>\d+)-(?<d>\d+)_(?<h>\d+)-(?<mm>\d+)(?:-(?<s>\d+))?-(?<c>.*).mp4$/g;

	function matchRegex( regex, value )
	{
		var result = regex.exec( value )

		regex.lastIndex = 0

		return result;
	}

	var matchFolder = ( folder ) => matchRegex( folderRegex, folder )
	var matchClip = ( file ) => matchRegex( clipRegex, file )

	function extractDate( match )
	{
		var year = Number( match.groups[ "y" ] )
		var month = Number( match.groups[ "m" ] ) - 1
		var day = Number( match.groups[ "d" ] )
		var hour = Number( match.groups[ "h" ] )
		var minute = Number( match.groups[ "mm" ] )
		var second = match.groups[ "s" ] ? Number( match.groups[ "s" ] ) : 0

		return new Date( year, month, day, hour, minute, second )
	}

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

	function groupFiles( folder, files )
	{
		var fileInfos = []

		for ( var file of files )
		{
			var match = matchClip( file )

			if ( match && match.length > 0 )
			{
				var date = extractDate( match )
				var camera = match.groups[ "c" ]
				var filePath = folder + "/" + file // path.join( folder, file )

				fileInfos.push( { date: date, camera: camera, file: filePath } )
			}
		}

		fileInfos.sort( ( f1, f2 ) => f1.date.getTime() - f2.date.getTime() )

		return groupBy( fileInfos, f => f.date.toString() )
	}

	function addControls( container, videos, onCopy = null, onDelete = null )
	{
		if ( onDelete )
		{
			container.find( ".delete" ).click( onDelete )
		}

		if ( onCopy )
		{
			container.find( ".copy" ).click( onCopy )
		}

		var playPause = container.find( ".playPause" )

		playPause.click( ( e, ev ) => videos.each( ( i, v ) =>
			{
				if ( v.paused ) { v.play(); playPause.text( "Pause" ); }
				else { v.pause(); playPause.text( "Play" ); }
			} ) )

		var scrub = container.find( ".scrub" )

		scrub.on( "input", ( e, ev ) =>
		{
			var duration = 0.0

			videos.each( ( i, v ) => { if ( !isNaN( v.duration ) ) duration = Math.max( duration, v.duration ) } )
		
			videos.each( ( i, v ) =>
			{
				if ( !isNaN( v.duration ) ) v.currentTime = Math.min( v.duration, duration * ( scrub.val() / 100 ) )
			} )
		} )

		function updateScrub()
		{
			var duration = 0.0
			var total = 0.0
			var count = 0

			videos.each( ( i, v ) =>
			{
				if ( !isNaN( v.duration ) )
				{
					duration = Math.max( duration, v.duration )
					total += v.currentTime
					++ count
				}
			} )

			if ( count > 0 ) scrub.val( ( total / count ) / duration * 100 )
		}

		setInterval( updateScrub, 250 )
	}

	function isInViewport( elem )
	{
		var bounding = elem.getBoundingClientRect()

		return (
			bounding.top >= 0 &&
			bounding.left >= 0 &&
			bounding.bottom <= ( window.innerHeight || document.documentElement.clientHeight ) &&
			bounding.right <= ( window.innerWidth || document.documentElement.clientWidth )
		)
	}

	function getTimes( dateGroups, date )
	{
		var times = []

		var timeValues = dateGroups.get( date.toDateString() )

		if ( timeValues )
		{
			for ( var time of timeValues )
			{
				var name = new Date( time.date ).toString()

				if ( time.recent ) name += " (Recent)"

				times.push( { time: time, name: name } )
			}
		}

		return times
	}

	return {
		matchFolder: matchFolder,
		matchClip: matchClip,
		extractDate: extractDate,
		groupBy: groupBy,
		groupFiles: groupFiles,
		getTimes: getTimes
	}
} ) );
