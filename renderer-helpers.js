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
	var div = exports.addElement( container, "div" )
	var playPause = exports.addElement( div, "button", { type: "button" } )
	var range = exports.addElement( div, "input", { type: "range", value: 0 } )

	playPause.innerText = "Play"

	playPause.addEventListener( "click", ( e, ev ) => videos.forEach( v =>
		{
			if ( v.paused ) { v.play(); playPause.innerText = "Pause"; }
			else { v.pause(); playPause.innerText = "Play"; }
		} ) )

	range.addEventListener( "input", ( e, ev ) =>
	{
		var duration = 0.0

		videos.forEach( v => { if ( !isNaN( v.duration ) ) duration += v.duration } )
	
		videos.forEach( v =>
		{
			if ( !isNaN( v.duration ) ) v.currentTime = duration * ( range.value / 100 )
		} )
	 } )

	 var positions = new Array( videos.length )

	 function updateRange()
	 {
		 var total = 0.0
		 var count = 0

		 for ( var p of positions )
		 {
			 if ( !isNaN( p ) )
			 {
				 ++ count;
				 total += p
			 }
		 }

		 if ( count > 0 ) range.value = total / count
	 }

	 setTimeout( updateRange, 100 );

	 videos.forEach( ( v, i ) =>
		{
			v.addEventListener( "timeupdate", () =>
			{
				positions[ i ] = !isNaN( v.duration )
					? ( 100 / v.duration ) * v.currentTime
					: NaN
			});
		})

	container.appendChild( div )

	return div
}
