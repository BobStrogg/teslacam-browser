const { contextBridge, ipcRenderer } = require( "electron" )

contextBridge.exposeInMainWorld( "teslacam",
{
	openFolders: () => ipcRenderer.sendSync( "openFolders" ),
	reopenFolders: () => ipcRenderer.sendSync( "reopenFolders" ),
	openFolder: folder => ipcRenderer.sendSync( "openFolder", folder ),
	getFiles: folder => ipcRenderer.sendSync( "getFiles", folder ),
	openBrowser: () => ipcRenderer.send( "openBrowser" ),
	deleteFiles: files => ipcRenderer.send( "deleteFiles", files ),
	deleteFolder: folder => ipcRenderer.send( "deleteFolder", folder ),
	copyFilePaths: filePaths => ipcRenderer.send( "copyFilePaths", filePaths ),
	copyPath: folderPath => ipcRenderer.send( "copyPath", folderPath ),
	openExternal: filePath => ipcRenderer.send( "openExternal", filePath )
} )
