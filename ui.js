( function ( root, factory )
{
	if ( typeof define === 'function' && define.amd ) define( [], factory );
	else if ( typeof exports === 'object' ) module.exports = factory();
	else root.ui = factory();
}( typeof self !== 'undefined' ? self : this, function ()
{
    function createVueApp( handlers )
    {
        return new Vue(
        {
            el: '#root',
            data:
            {
                args: { version: null },
                showSidebar: true,
                selectedDate: null,
                times: [],
                selectedPath: null,
                timespans: [],
                playing: null
            },
            watch:
            {
                selectedDate: function( newDate, oldDate )
                {
                    this.times = helpers.getTimes( this.args.dateGroups, newDate )
                    this.selectedPath = ( this.times.length > 0 ) ? this.times[ 0 ].time.relative : null
                },
                selectedPath: function( newPath, oldPath )
                {
                    function makeTimespan( key, value )
                    {
                        var viewOrder = [ "left_repeater", "front", "right_repeater" ]
                        var views = Array.from( value )

                        views.sort( ( v1, v2 ) => viewOrder.indexOf( v1.camera ) - viewOrder.indexOf( v2.camera ) )

                        return {
                            title: key,
                            scrub: 0,
                            playing: false,
                            visible: false,
                            views: views
                        }
                    }

                    handlers.getFiles( newPath, files =>
                        {
                            this.timespans = Array.from( helpers.groupFiles( handlers.getVideoPath( newPath ), files ) )
                                .map( ( [ key, value ] ) => makeTimespan( key, value ) )
                        } )
                        //.fail( ( jqxhr, textStatus, error ) => console.log( error ) )
                }
            },
            methods:
            {
                openFolder: function()
                {
                    handlers.openFolder( this.loaded )
                },
                openBrowser: function()
                {
                    handlers.openBrowser()
                },
                loaded: function( args )
                {
                    if ( args )
                    {
                        this.args = args

                        if ( args.dateGroups )
                        {
                            args.dateGroups = new Map( args.dateGroups )

                            flatpickr(
                                $( "#calendar" ),
                                {
                                    onChange: d => this.selectedDate = d[ 0 ],
                                    enable: this.args.dates,
                                    inline: true
                                } )
                        }
                    }
                },
                playPause: function( timespan )
                {
                    if ( !timespan.playing )
                    {
                        if ( this.playing ) this.playing.playing = false

                        this.playing = timespan
                        timespan.playing = true
                        timespan.visible = true
                    }
                    else
                    {
                        this.playing = null
                        timespan.playing = false
                    }
                },
                deleteFiles: function( timespan )
                {
                    var files = timespan.views.map( v => v.file )

                    if ( confirm( `Are you sure you want to delete ${files.length} files?` ) )
                    {
                        handlers.deleteFiles( files )
                    }
                },
                copyFilePaths: function( timespan )
                {
                    var files = timespan.views.map( v => v.file )

                    handlers.copyFilePaths( files )
                },
                deleteFolder: function( folder )
                {
                    if ( confirm( `Are you sure you want to delete ${folder}?` ) )
                    {
                        handlers.deleteFolder( folder )
                    }
                },
                copyPath: function( path )
                {
                    handlers.copyPath( path )
                }
            }
        });
    }

    function createVideosComponent( handlers )
    {
        return Vue.component( "videos",
        {
            props: [ "timespan" ],
            data: function()
            {
                return { error: null }
            },
            template:
                `<div v-if="timespan.visible">
                    <div class="d-flex videoContainer card-body">
                        <div v-for="view in timespan.views" class="column">
                            <video :ref="view.camera" class="video" :class="view.camera" :src="view.file" :autoplay="timespan.playing" @timeupdate="timeChanged( timespan, view.camera, $event.target )" @pause="timespan.playing = false" ></video>
                        </div>
                    </div>
                    <div class="alert alert-danger error" v-show="error"><div>{{ error }}</div><div @click="openBrowser" style="cursor: pointer;">Try external browser</div></div>
                </div>`,
            watch:
            {
                "timespan.scrub":
                {
                    handler: function( scrub )
                    {
                        var videos = Object.values( this.$refs ).map( v => v[ 0 ] ).filter( v => v && v.paused )
                        var duration = 0.0
    
                        videos.forEach( v =>
                        {
                            if ( !isNaN( v.duration ) ) duration = Math.max( duration, v.duration )
                        } )
    
                        videos.forEach( v =>
                        {
                            if ( !isNaN( v.duration ) ) v.currentTime = Math.min( v.duration, duration * ( scrub / 100 ) )
                        } )
                    }
                },
                "timespan.playing":
                {
                    handler: function( playing )
                    {
                        for ( var video of Object.values( this.$refs ) )
                        {
                            if ( video.length > 0 )
                            {
                                if ( playing ) video[ 0 ].play().catch( e => this.error = e.message )
                                else video[ 0 ].pause()
                            }
                        }
                    }
                }
            },
            methods:
            {
                openBrowser: function()
                {
                    handlers.openBrowser()
                },
                currentTime: function( scrub, view )
                {
                    var camera = view.camera
    
                    if ( this.$refs[ camera ] && this.$refs[ camera ].length > 0 )
                    {
                        var video = this.$refs[ camera ][ 0 ]
    
                        return !video.paused
                            ? video.currentTime
                            : scrub * this.$refs[ camera ][ 0 ].duration / 100
                    }
    
                    return 0
                },
                timeChanged: function( timespan, camera, video )
                {
                    if ( camera == "front" && !video.paused )
                    {
                        timespan.scrub = Math.round( video.currentTime / video.duration * 100 )
                    }
                }
            }
        } )
    }

    function initialize( handlers )
    {
        var vueApp = createVueApp( handlers )
        var videosComponent = createVideosComponent( handlers )

        return vueApp
    }

    return {
        initialize: initialize
    }
} ) );
