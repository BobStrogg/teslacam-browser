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
