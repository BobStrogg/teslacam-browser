( function ( root, factory )
{
	if ( typeof define === "function" && define.amd ) define( [], factory );
	else if ( typeof exports === "object" ) module.exports = factory();
	else root.hevc = factory();
}( typeof self !== "undefined" ? self : this, function ()
{
	// Tesla HW3+ clips are MP4 with hvc1 (parameter sets in the sample entry) or, less often, hev1.
	var HEVC_TYPES =
	[
		"video/mp4; codecs=\"hvc1.1.6.L93.B0\"",
		"video/mp4; codecs=\"hev1.1.6.L93.B0\"",
		"video/mp4; codecs=\"hvc1\"",
		"video/mp4; codecs=\"hev1\""
	]
	var AVC_TYPE = "video/mp4; codecs=\"avc1.42E01E\""

	var FALLBACK_MESSAGE = "Tesla HW3 and later clips are HEVC (H.265). This browser cannot decode them, so the picture stays blank. macOS can play them in Safari or in this desktop app (Apple Silicon and Intel, via VideoToolbox). Windows can play them in Edge, Chrome, or this app after the HEVC Video Extensions are installed. Linux builds of Chrome and Electron do not include an HEVC decoder. Use Browse to try another browser, or copy the folder path into tesla_dashcam."

	function probe( canPlayType, isTypeSupported, type )
	{
		var played = ""
		var mediaSource = false

		try
		{
			if ( canPlayType ) played = canPlayType( type ) || ""
		}
		catch ( e )
		{
			played = ""
		}

		try
		{
			if ( isTypeSupported ) mediaSource = !!isTypeSupported( type )
		}
		catch ( e )
		{
			mediaSource = false
		}

		return { type: type, canPlayType: played, mediaSource: mediaSource }
	}

	function isPositive( result )
	{
		return result.canPlayType === "probably" || result.mediaSource === true
	}

	function detect( media )
	{
		var canPlayType = null
		var isTypeSupported = null

		if ( media )
		{
			canPlayType = media.canPlayType
			isTypeSupported = media.isTypeSupported
		}
		else if ( typeof document !== "undefined" )
		{
			var video = document.createElement( "video" )

			canPlayType = video.canPlayType.bind( video )

			if ( typeof MediaSource !== "undefined" && MediaSource.isTypeSupported )
			{
				isTypeSupported = MediaSource.isTypeSupported.bind( MediaSource )
			}
		}

		var hevc = HEVC_TYPES.map( type => probe( canPlayType, isTypeSupported, type ) )
		var avc = probe( canPlayType, isTypeSupported, AVC_TYPE )
		var supported = hevc.some( isPositive )
		var maybe = !supported && hevc.some( result => result.canPlayType === "maybe" )

		return {
			supported: supported,
			maybe: maybe,
			hevc: hevc,
			avc: avc,
			message: supported ? "" : FALLBACK_MESSAGE
		}
	}

	return {
		HEVC_TYPES: HEVC_TYPES,
		AVC_TYPE: AVC_TYPE,
		detect: detect,
		fallbackMessage: function () { return FALLBACK_MESSAGE }
	}
} ) );
