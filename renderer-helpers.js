exports.extractDate = ( match, hasSeconds = false ) =>
{
    var year = Number( match[ 1 ] )
    var month = Number( match[ 2 ] ) - 1
    var day = Number( match[ 3 ] )
    var hour = Number( match[ 4 ] )
    var minute = Number( match[ 5 ] )
    var second = hasSeconds ? Number( match[ 6 ] ) : 0

    return new Date( year, month, day, hour, minute, second )
}

exports.groupBy = ( list, keyGetter ) =>
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

exports.addElement = ( container, name, attributes ) =>
{
    var element = document.createElement( name )

    container.appendChild( element )

    if ( attributes )
    {
        for ( var key in attributes ) element.setAttribute( key, attributes[ key ] )
    }

    return element
}

exports.addControls = ( container, videos ) =>
{
	var playPause = exports.addElement( container, "button", { type: "button", class: "playPause" } )
	var scrub = exports.addElement( container, "input", { type: "range", value: 0, class: "scrub" } )

	playPause.innerText = "Play"

	playPause.addEventListener( "click", ( e, ev ) => videos.forEach( v =>
		{
			if ( v.paused ) { v.play(); playPause.innerText = "Pause"; }
			else { v.pause(); playPause.innerText = "Play"; }
		} ) )

	scrub.addEventListener( "input", ( e, ev ) =>
	{
		var duration = 0.0

		videos.forEach( v => { if ( !isNaN( v.duration ) ) duration = Math.max( duration, v.duration ) } )
	
		videos.forEach( v =>
		{
			if ( !isNaN( v.duration ) ) v.currentTime = Math.min( v.duration, duration * ( scrub.value / 100 ) )
		} )
	 } )

	function updateScrub()
	{
		var duration = 0.0
		var total = 0.0
		var count = 0

		for ( var v of videos )
		{
			if ( !isNaN( v.duration ) )
			{
				duration = Math.max( duration, v.duration )
				total += v.currentTime
				++ count
			}
		}

		if ( count > 0 ) scrub.value = ( total / count ) / duration * 100
	}

	setInterval( updateScrub, 250 );
}
