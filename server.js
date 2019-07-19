// Modules to control application life and create native browser window
const services = require( "./services" )
const fs = require( "fs" )
const express = require( "express" )

const port = 8088
const defaultFolder = ( process.argv.length > 2 ) ? process.argv[ 2 ] : ""

services.setVersion( process.env.npm_package_version )

services.setFolder( defaultFolder )
services.initializeExpress( port )
