Option Explicit

Dim shell, fso, projectFolder, nodeModulesFolder, electronExecutable

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Define paths
projectFolder = shell.CurrentDirectory
nodeModulesFolder = projectFolder & "\node_modules"
electronExecutable = projectFolder & "\node_modules\.bin\electron"

' Function to check if a command exists
Function CommandExists(command)
    On Error Resume Next
    CommandExists = shell.Exec("cmd /c " & command & " --version").StdOut.ReadAll() <> ""
    On Error GoTo 0
End Function

' Check if npm is installed
If Not CommandExists("npm") Then
    shell.Popup "npm is not installed. Please install Node.js from https://nodejs.org/ and try again.", 0, "Error", 48
    WScript.Quit 1
End If

' Check if node_modules folder exists
If Not fso.FolderExists(nodeModulesFolder) Then
    ' Run npm install to install dependencies in hidden mode
    shell.Run "cmd /c npm install", 0, True
End If

' Check if Electron executable exists
If Not fso.FileExists(electronExecutable) Then
    ' Run npm install electron if Electron is not installed, in hidden mode
    shell.Run "cmd /c npm install electron", 0, True
End If

' Launch the application via Electron in hidden mode
shell.Run "cmd /c """ & electronExecutable & """ .", 0, False

' Clean up
Set shell = Nothing
Set fso = Nothing
