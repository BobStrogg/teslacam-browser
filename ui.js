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
                combineClips: true,
                selectedDate: null,
                times: [],
                selectedTime: null,
                selectedPath: null,
                timespans: [],
                controls:
                {
                    playing: false,
                    timespan: null,
                    speed: 1
                },
                playing: null
            },
            watch:
            {
                selectedDate: function( newDate, oldDate )
                {
                    this.times = helpers.getTimes( this.args.dateGroups, newDate )
                    this.selectedTime = ( this.times.length > 0 ) ? this.times[ 0 ] : null
                    this.selectedPath = ( this.selectedTime ) ? this.selectedTime.time.relative : null
                },
                selectedTime: function( newTime, oldTime )
                {
                    var index = this.times.indexOf( newTime )
                    var time = this.times[ index ]

                    this.selectedPath = time.time.relative
                },
                selectedPath: function( newPath, oldPath )
                {
                    function makeTimespan( key, value )
                    {
                        var viewOrder = [ "left_repeater", "front", "right_repeater" ]
                        var views = Array.from( value )

                        views.sort( ( v1, v2 ) => viewOrder.indexOf( v1.camera ) - viewOrder.indexOf( v2.camera ) )

                        return {    // Timespan
                            title: key,
                            time: new Date( key ),
                            scrub: 0,
                            playing: false,
                            visible: false,
                            currentTime: 0,
                            duration: null,
                            ended: false,
                            views: views
                        }
                    }

                    handlers.getFiles( newPath, files =>
                        {
                            this.timespans = Array.from( helpers.groupFiles( handlers.getVideoPath( newPath ), files ) )
                                .map( ( [ key, value ] ) => makeTimespan( key, value ) )
                        } )
                },
                "controls.timespan.ended": function( ended, oldEnded )
                {
                    if ( ended && this.controls.playing )
                    {
                        var index = this.timespans.indexOf( this.controls.timespan )

                        if ( index < this.timespans.length - 1 )
                        {
                            var timespan = this.timespans[ index + 1 ]

                            this.controls.timespan = timespan

                            timespan.currentTime = 0
                            timespan.ended = false
                            timespan.playing = true
                        }
                        else
                        {
                            this.controls.playing = false
                        }
                    }
                },
                "controls.timespan.playing": function( playing, oldPlaying )
                {
                    this.controls.playing = playing
                },
                duration: function( duration )
                {
                    this.controls.timespan = ( this.timespans.length > 0 ) ? this.timespans[ 0 ] : null
                    this.controls.playing = false
                    this.controls.scrub = 0
                }
            },
            computed:
            {
                duration: function()
                {
                    return this.timespans.reduce( ( t, ts ) => t + ts.duration, 0 )
                },
                currentTime:
                {
                    get: function()
                    {
                        var startTime = 0

                        for ( var timespan of this.timespans )
                        {
                            if ( timespan == this.controls.timespan )
                            {
                                return startTime + Number( timespan.currentTime )
                            }
    
                            startTime += timespan.duration
                        }
                    },
                    set: function( newTime )
                    {
                        var startTime = 0

                        for ( var timespan of this.timespans )
                        {
                            if ( newTime < startTime + timespan.duration )
                            {
                                this.controls.timespan = timespan
                                timespan.currentTime = newTime - startTime
                                break
                            }

                            startTime += timespan.duration
                        }
                    }
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
                    if ( this.controls.timespan && this.controls.timespan != timespan )
                    {
                        this.controls.timespan.playing = false
                    }

                    if ( this.controls ) this.controls.timespan = timespan

                    timespan.visible |= ( timespan.playing = !timespan.playing )
                },
                scrubInput: function( timespan )
                {
                    timespan.playing = false

                    if ( this.controls ) this.controls.timespan = timespan
                },
                deleteFiles: function( timespan )
                {
                    var files = timespan.views.map( v => v.file )

                    if ( confirm( `Are you sure you want to delete ${files.length} files from ${timespan.title}?` ) )
                    {
                        handlers.deleteFiles( files )
                    }
                },
                copyFilePaths: function( timespan )
                {
                    var files = timespan.views.map( v => v.file )

                    handlers.copyFilePaths( files )

                    alert( "Copied file paths to clipboard" )
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

                    alert( "Copied folder path to clipboard" )
                },
                timespanTime: function( timespan )
                {
                    if ( !timespan ) return null

                    var time = new Date( timespan.time )

                    time.setSeconds( time.getSeconds() - timespan.duration + Number( timespan.currentTime ) )

                    return time
                }
            }
        });
    }

    function createVideoGroupComponent( handlers )
    {
        return Vue.component( "VideoGroup",
        {
            props: [ "controls", "timespans" ],
            data: function()
            {
                return {
                    error: null,
                    duration: null
                }
            },
            template:
                `<div>
                    <div v-for="timespan in timespans" v-show="timespan === controls.timespan">
                        <div class="d-flex">
                            <div v-for="view in timespan.views" class="column ml-1">
                                <div :title="view.fileName" class="text-center">{{ view.fileName }}</div>
                                <synchronized-video :timespan="timespan" :view="view" :playbackRate="controls.speed"></synchronized-video>
                            </div>
                        </div>
                        <div class="alert alert-danger error" v-show="error">
                            <div>{{ error }}</div>
                            <div @click="openBrowser" style="cursor: pointer;">Try external browser</div>
                        </div>
                    </div>
                </div>`,
            watch:
            {
                "controls.playing": function( playing, oldPlaying )
                {
                    for ( var timespan of this.timespans )
                    {
                        timespan.ended = false
                        timespan.playing = ( timespan == this.controls.timespan )
                            ? playing
                            : false
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
                durationChanged: function( timespan, camera, video )
                {
                    if ( camera == "front" )
                    {
                        this.duration = Math.max( this.duration, timespan.duration = video.duration )
                    }
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

    function createVideosComponent( handlers )
    {
        return Vue.component( "Videos",
        {
            props: [ "controls", "timespan" ],
            data: function()
            {
                return {
                    error: null,
                    duration: null
                }
            },
            template:
                `<div>
                    <div class="d-flex">
                        <div v-for="view in timespan.views" class="column ml-1">
                            <div :title="view.fileName" class="text-center">{{ view.fileName }}</div>
                            <synchronized-video :timespan="timespan" :view="view" :playbackRate="controls.speed"></synchronized-video>
                        </div>
                    </div>
                    <div class="alert alert-danger error" v-show="error">
                        <div>{{ error }}</div>
                        <div @click="openBrowser" style="cursor: pointer;">Try external browser</div>
                    </div>
                </div>`,
            methods:
            {
                openBrowser: function()
                {
                    handlers.openBrowser()
                },
            }
        } )
    }

    function createVideoComponent( handlers )
    {
        return Vue.component( "SynchronizedVideo",
        {
            props: [ "timespan", "view", "playbackRate" ],
            data: function()
            {
                return {
                    error: null,
                    duration: null,
                    timeout: null
                }
            },
            template:
                `<video ref="video" class="video" :class="view.camera" :src="view.file" :autoplay="timespan.playing" :playbackRate.prop="playbackRate" preload="metadata" @durationchange="durationChanged" @timeupdate="timeChanged" @ended="ended" title="Open in file explorer" @click="openExternal"></video>`,
            watch:
            {
                "timespan.playing":
                {
                    handler: function( playing, oldPlaying )
                    {
                        var video = this.$refs[ "video" ]

                        if ( video )
                        {
                            if ( playing )
                            {
                                video.playbackRate = this.playbackRate

                                var currentTime = this.timespan.currentTime - ( this.timespan.duration - video.duration )

                                if ( currentTime < 0 )
                                {
                                    var delay = -currentTime / this.playbackRate

                                    console.log( `Delaying ${this.view.file} for ${delay}` )
                                    this.timeout = window.setTimeout(
                                        () =>
                                        {
                                            this.timeout = null
                                            video.style.opacity = 1.0
                                            video.play().catch( e => this.error = e.message )
                                        },
                                        delay * 1000 )
                                }
                                else
                                {
                                    console.log( `Playing ${this.view.file}` )
                                    this.timeout = null
                                    video.style.opacity = 1.0
                                    video.play().catch( e => this.error = e.message )
                                }
                            }
                            else
                            {
                                if ( this.timeout )
                                {
                                    window.clearTimeout( this.timeout )
                                    this.timeout = null
                                }
                                else
                                {
                                    video.pause()
                                }
                            }
                        }
                    }
                },
                "timespan.currentTime":
                {
                    handler: function( currentTime, oldTime )
                    {
                        var video = this.$refs[ "video" ]

                        if ( video && !this.timespan.playing )
                        {
                            var adjustedTime = currentTime - ( this.timespan.duration - video.duration )

                            if ( !isNaN( adjustedTime ) && isFinite( adjustedTime ) && adjustedTime >= 0 )
                            {
                                video.currentTime = adjustedTime
                                video.style.opacity = 1.0
                            }
                            else video.style.opacity = 0.3
                        }
                    }
                }
            },
            methods:
            {
                durationChanged: function( event )
                {
                    var video = event.target

                    this.timespan.duration = Math.max( this.timespan.duration, video.duration )
                },
                timeChanged: function( event )
                {
                    var video = event.target

                    if ( !video.paused && video.duration == this.timespan.duration )
                    {
                        this.timespan.currentTime = video.currentTime
                    }
                },
                ended()
                {
                    this.timespan.playing = false
                    this.timespan.ended = true
                },
                openExternal: function()
                {
                    handlers.openExternal( this.view.file )
                }
            }
        } )
    }

    function initialize( handlers )
    {
        var videoGroupComponent = createVideoGroupComponent( handlers )
        var videosComponent = createVideosComponent( handlers )
        var videoComponent = createVideoComponent( handlers )

        return createVueApp( handlers )
    }

    return {
        initialize: initialize
    }
} ) );
