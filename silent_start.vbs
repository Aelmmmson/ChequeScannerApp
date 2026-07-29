Set WshShell = CreateObject("WScript.Shell")
strPath = WScript.ScriptFullName
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objFile = objFSO.GetFile(strPath)
strFolder = objFSO.GetParentFolderName(objFile)

' Launch start_services.bat completely hidden (0 = hidden window)
WshShell.Run chr(34) & strFolder & "\start_services.bat" & chr(34), 0, False
Set WshShell = Nothing
