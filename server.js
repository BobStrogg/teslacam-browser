// Modules to control application life and create native browser window
const services = require( "./services" )
const fs = require( "fs" )
const express = require( "express" )

const port = 8088

services.setVersion( app.getVersion() )

services.setFolder( "" )
services.initializeExpress( port )
