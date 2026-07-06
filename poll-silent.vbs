' Runs RSS poll with no visible window (for Task Scheduler).
Option Explicit

Dim shell, fso, root, cmd

Set shell = CreateObject("Wscript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)

cmd = "cmd /c cd /d """ & root & """ && node """ & root & "\scripts\poll-feeds.mjs"""
shell.Run cmd, 0, False
