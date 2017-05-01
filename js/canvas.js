"use strict";

const Style_RedTeam = "#FF0000"
const Style_BlueTeam = "#0040FF"

const Style_SquadLeaderStroke = "white"
const Style_GruntStroke = "black"

const Style_Selection = "#BEA425"
const Style_SquadSelection = "#44FF00"

const Style_HealthBarGreen = "green"
const Style_HealthBarRed = "red"

function interpolate(Start, End)
{
	return Start * (1 - interpolation_CurrentAmount) + End * interpolation_CurrentAmount
}

function interpolateAngle(Start, End)
{
	if (End - Start > 180)
		End -= 360
	else if (Start - End > 180)
		Start -= 360

	return Start * (1 - interpolation_CurrentAmount) + End * interpolation_CurrentAmount
}

//for UI purposes only
var playSpeed = 1
	//black magic do not touch
function setSpeed(multiplier)
{
	playSpeed = multiplier

	var currentInterpAmount = interpolation_CurrentFrame / interpolation_FramesPerTick //The current amount of % ([0,1]) between last tick and current tick
	interpolation_FramesPerTick = ((1000 / frameTime) / multiplier) * DemoTimePerTick //How many frames per game tick would I need at X fps for this speed?
	interpolation_CurrentFrame = Math.round(currentInterpAmount * interpolation_FramesPerTick) //Set the current interpolation amount to be roughly around the same % as it was before the speed change 

	updateHeader()
}

var interpolation_FramesPerTick = 15 //how many frames per game tick
var interpolation_CurrentFrame = 0 //current frame (out of frames per tick)
var interpolation_CurrentAmount = 0


// Current Camera position (Canvas X,Y of TopLeft corner on map) 
var CameraX = 100
var CameraY = 0
	// Current zoom 
var CameraZoom = 1
var MapImageDrawSize = 1024 //this helper value is ALWAYS CameraZoom * 1024
	// Map size in km
var MapSize = 2048

// Scale from game X/Y to canvas coordinates
function XtoCanvas(x)
{
	// To (-512,512) 
	x /= MapSize
		// To (0,1024) 
	x += 512
		// To zoom
	x *= CameraZoom
		// Camera Offset 
	x += CameraX

	return x
}

function YtoCanvas(y)
{
	// Y is inverted 
	y /= -MapSize
	y += 512
	y *= CameraZoom
	y += CameraY
	return y
}
//scale game length to canvas pixels. used for radius
function lengthtoCanvas(r)
{
	r /= MapSize
	r *= CameraZoom
	return r
}


// canvas element
var Canvas
	// the canvas' context
var Context
	// the div the canvas is in
var mapDiv
	// Draw the canvas



var PlayerCircleSize = 8
	// A list of vehicles that has a player of the selected squad in. reset and filled every draw (TODO just set it every Update instead?)
var SquadVehicles

function drawCanvas()
{
	if (!MapImageReady)
		return
	
	//Reset canvas width and height (Efficient, only does actual changes if value differs)
	Canvas.width = mapDiv.clientWidth
	Canvas.height = mapDiv.clientHeight

	//Clear canvas, reapply new background
	Context.clearRect(0, 0, Canvas.width, Canvas.height);
	if (options_DrawDOD)
		Context.drawImage(MapImageWithCombatArea, CameraX, CameraY, MapImageDrawSize, MapImageDrawSize)
	else
		Context.drawImage(MapImage, CameraX, CameraY, MapImageDrawSize, MapImageDrawSize)

	//Draw Flags
	Context.lineWidth = 1
	for (var i in AllFlags)
		drawFlag(i)


	//Draw Rallies
	Context.font = "bold 26px Arial";
	Context.strokeStyle = "green"
	Context.lineWidth = 2;
	for (var i in AllRallies)
		drawRally(i)

	//Draw killlines
	if (options_DrawKillLines)
		for (var i = 0, len = killLines.length; i < len; i++)
			killLine_Draw(killLines[i]);

	//Draw fobs
	Context.lineWidth = 1;
	Context.strokeStyle = "black"
	for (var i in AllFobs)
		drawFob(i)

	
	
	SquadVehicles = new Set()
	for (var i in AllPlayers)
		if (i != SelectedPlayer)
			drawPlayer(i)

	Context.font = "bold 12px Arial";
	for (var i in AllVehicles)
		drawVehicle(i)
	
	for (var i in AllCaches)
		drawCache(i)
	
	//Draw selected player above everyone else
	if (SelectedPlayer != SELECTED_NOTHING)
		drawPlayer(SelectedPlayer)


	//Draw selected kill line
	if (SelectedKill != SELECTED_NOTHING)
		killLine_DrawSelected()
		
	
	drawAllHightlights()
}

var drawTeam1 = true;
var drawTeam2 = true;

function drawPlayer(index)
{
	const p = AllPlayers[index]
	if (p.isJoining || !p.lastX) //Skip if joining or unknown pos
		return

	if (p.team == 1)
	{
		if (!drawTeam1)
			return;
	}
	else
	{
		if (!drawTeam2)
			return;
	}
	
	
	var x = XtoCanvas(interpolate(p.lastX, p.X))
	var y = YtoCanvas(interpolate(p.lastZ, p.Z))
	const rot = interpolateAngle(p.Lastrotation, p.rotation)
	if (options_ClampVehiclesToMap)
	{
		x = clamp(CameraX, x, CameraX + MapImageDrawSize)
		y = clamp(CameraY, y, CameraY + MapImageDrawSize)
	}
	
	
	//Decide circle size
	if (options_DrawKitIcons || p.isSquadLeader)
		PlayerCircleSize = 8
	else
		PlayerCircleSize = 6
	
	
	Context.beginPath()

	//In vehicle (that is not a climbing vehicle), has to be alive
	if (p.vehicleid >= 0 && !isVehicleContainer(p.vehicleid))
	{
		
		if (p.team == SelectedSquadTeam && p.squad == SelectedSquadNumber)
			SquadVehicles.add(p.vehicleid)
		/* Only driver is drawn currently since you can't properly get the rotation of objects in python 
		 * TODO: Find a different representation for gunner + passengers */
		if (p.vehicleSlot == 0) // Driver
		{
			// Field of view thingy
			setTeamSquadColor(p.team, p.squad)
			drawFieldOfView(x, y, rot, 0.3)
		}
	}
	else //Not in vehicle (dead or alive)
	{
		if (p.isAlive) // Alive, not in vehicle
		{ 
			drawPlayer_DrawAlive(p, x, y)

			if (options_health_players || HealthButtonDown)
				drawHealthBar(p, x, y)

			// Heading arrow
			setTeamSquadColor(p.team, p.squad)
			drawHeadingArrow(x, y, rot, p.team)
			
			if (options_DrawKitIcons)
				drawPlayer_DrawKit(p, x, y)
		}
		else //is dead
		{
			drawPlayer_DrawDead(p, x, y)
		}
		
		
		if (options_DrawKitIcons) //Draw mode Kit icons
		{
			drawPlayer_DrawKit(p, x, y)
		}
		else //Draw mode SL numbers
		{
			if (p.isSquadLeader)
				drawPlayer_DrawSLNumber(p, x, y)
		}
		
	}
}

function drawPlayer_DrawSLNumber(p, x, y)
{
	Context.fillStyle = "black"
	Context.font = "bold " + 15 + "px arial";
	Context.fillText(p.squad, x-4.5 , y+5)
}

function drawPlayer_DrawKit(p, x, y)
{
	Context.drawImage(KitIconList[p.kitImage], x - 7, y - 7, 14, 14)
}

function drawPlayer_DrawDead(p, x, y)
{
	const outerstyle = p.isSquadLeader ? Style_SquadLeaderStroke : Style_GruntStroke
	if (p.id == SelectedPlayer) //is selected
		drawPlayer_DrawHollowWithInnerStroke(p, x, y, outerstyle, Style_Selection)
	else if (p.team == SelectedSquadTeam && p.squad == SelectedSquadNumber) //is squad selected
		drawPlayer_DrawHollowWithInnerStroke(p, x, y, outerstyle, Style_SquadSelection)
	else
	{
		const teamstyle = (p.team == 2) ? Style_BlueTeam : Style_RedTeam
		drawPlayer_DrawHollowWithInnerStroke(p, x, y, outerstyle, teamstyle)
	}
}

function drawPlayer_DrawAlive(p, x, y)
{
	const outerstyle = p.isSquadLeader ? Style_SquadLeaderStroke : Style_GruntStroke
	const teamstyle = (p.team == 2) ? Style_BlueTeam : Style_RedTeam


	if (p.team == SelectedSquadTeam && p.squad == SelectedSquadNumber) //is squad selected
	{
		if (p.id == SelectedPlayer) //is selected
			drawPlayer_DrawSelected(p, x, y, Style_SquadSelection)
		else
			drawPlayer_DrawNormal(p, x, y, Style_SquadSelection, outerstyle)

	}
	else if (p.id == SelectedPlayer) //is selected
		drawPlayer_DrawSelected(p, x, y, teamstyle)
	else
		drawPlayer_DrawNormal(p, x, y, teamstyle, outerstyle)
}


function drawPlayer_DrawSelected(p, x, y, fill)
{
	Context.fillStyle = fill
	Context.strokeStyle = Style_Selection
	Context.beginPath()
	Context.arc(x, y, PlayerCircleSize, 0, Math.PI * 2)
	Context.fill()
	Context.lineWidth = 3
	Context.stroke()
}


function drawPlayer_DrawNormal(p, x, y, FillStyle, OuterStrokeStyle)
{
	Context.fillStyle = FillStyle
	Context.strokeStyle = OuterStrokeStyle
	Context.beginPath()
	Context.arc(x, y, PlayerCircleSize, 0, Math.PI * 2)
	Context.fill()
	Context.stroke()
}



function drawPlayer_DrawWithInnerStroke(p, x, y, FillStyle, OuterStrokeStyle, InnerStrokeStyle)
{
	Context.fillStyle = FillStyle
	Context.strokeStyle = InnerStrokeStyle
	Context.beginPath()
	Context.arc(x, y, PlayerCircleSize - 1, 0, Math.PI * 2)
	Context.fill()
	Context.stroke()

	Context.beginPath()
	Context.arc(x, y, PlayerCircleSize, 0, Math.PI * 2)
	Context.strokeStyle = OuterStrokeStyle
	Context.stroke()
}

function drawPlayer_DrawHollowWithInnerStroke(p, x, y, OuterStrokeStyle, InnerStrokeStyle)
{
	Context.strokeStyle = InnerStrokeStyle
	Context.beginPath()
	Context.arc(x, y, PlayerCircleSize - 1, 0, Math.PI * 2)
	Context.stroke()

	Context.strokeStyle = OuterStrokeStyle
	Context.beginPath()
	Context.arc(x, y, PlayerCircleSize, 0, Math.PI * 2)
	Context.stroke()
}


var HEALTH_ERROR = -128
function drawHealthBar(p, x, y)
{
	if (p.health == HEALTH_ERROR)
		return
	
	const width = 24
	const height = 5
	const offsetX = -12
	const offsetY = -15

	const greenWidth = width / p.maxHealth * p.health
	const redWidth = width - greenWidth

	Context.fillStyle = Style_HealthBarGreen
	Context.fillRect(x + offsetX, y + offsetY, greenWidth, height);

	Context.fillStyle = Style_HealthBarRed
	Context.fillRect(x + offsetX + greenWidth, y + offsetY, redWidth, height);
}


function setTeamSquadColor(team, squad)
{
	const style = getStyle(team, squad)
	Context.fillStyle = style
	Context.strokeStyle = style
}


/* Set the fill style and stroke style before calling this function. */
function drawFieldOfView(x, y, rot, size)
{
	Context.save()
	Context.translate(x, y)
	Context.rotate(rot / 180 * Math.PI)
	Context.beginPath()
	Context.arc(0, 0, 5, (Math.PI * (18 / 12 + size / 2)), (Math.PI * (18 / 12 - size / 2)), true)
	Context.arc(0, 0, 14, (Math.PI * (18 / 12 - size / 2)), (Math.PI * (18 / 12 + size / 2)))
	Context.closePath()
		/* Only make the filling transparent */
	Context.globalAlpha = 0.4
	Context.fill()
	Context.stroke()
	Context.restore()
}

// Set the fill style before calling this function
function drawHeadingArrow(x, y, rot)
{
	Context.save()
	Context.translate(x, y)
	Context.rotate(rot / 180 * Math.PI)
	Context.beginPath()
	Context.arc(0, 0, 11, 15 / 12 * Math.PI, 21 / 12 * Math.PI)
	Context.lineTo(0, -16)
	Context.closePath()
	Context.fill()
	Context.restore()
}

var bluforflag
var opforflag
var neutralflag
function drawFlag(i)
{
	const f = AllFlags[i]
	const x = XtoCanvas(f.X)
	const y = YtoCanvas(f.Z)
	
	
	if (f.team == 2)
	{
		Context.drawImage(bluforflag, x - 16, y - 16)
		Context.fillStyle = "rgba(0, 32, 255, 0.1)";
		Context.strokeStyle = "blue"
	}
	else if (f.team == 1)
	{
		Context.drawImage(opforflag, x - 16, y - 16)
		Context.fillStyle = "rgba(255, 0, 0, 0.1)";
		Context.strokeStyle = "red"
	}
	else
	{
		Context.drawImage(neutralflag, x - 16, y - 16)
		Context.fillStyle = "rgba(160, 160, 160, 0.15)";
		Context.strokeStyle = "gray"
	}


	//draw radius
	if (options_DrawFlagRadius)
	{
		var r = lengthtoCanvas(f.Radius)
		Context.beginPath()
		Context.arc(x, y, r, 0, 2 * Math.PI)
		Context.fill()
		Context.stroke()
	}
}

function drawFob(i)
{
	const fob = AllFobs[i]
	const x = XtoCanvas(fob.X)
	const y = YtoCanvas(fob.Z)

	if (fob.team == 2)
	{
		if (!drawTeam2)
			return;
		Context.fillStyle = "blue"
	}
	else
	{
		if (!drawTeam1)
			return;
		Context.fillStyle = "red"
	}

	//triangle
	Context.beginPath()
	Context.lineTo(x - 7, y + 7)
	Context.lineTo(x + 7, y + 7)
	Context.lineTo(x, y - 7)
	Context.fill()
	Context.stroke()

	//circle
	Context.fillStyle = "black"
	Context.beginPath()
	Context.arc(x, y + 2, 2.5, 0, 2 * Math.PI)
	Context.fill()
}

function drawVehicle(i)
{

	const v = AllVehicles[i]
		// if vehicle is empty and we don't draw empty vehicles, 
	if (!options_DrawEmptyVehicles && v.Passengers.size == 0)
		return
	//or if is a climbing/container vehicle, skip
	if (isVehicleContainer(i))
		return

	if (v.team == 1 && !drawTeam1)
		return;
	if (v.team == 2 && !drawTeam2)
		return;

	var x = XtoCanvas(interpolate(v.lastX, v.X))
	var y = YtoCanvas(interpolate(v.lastZ, v.Z))
	const rot = interpolateAngle(v.Lastrotation, v.rotation)

	var color
	// if vehicle is selected 
	if (i == SelectedVehicle)
		color = 3
	else if (SquadVehicles.has(i))
		color = 2
	else if (v.team != 0)
		color = v.team - 1
	else
		color = 0

	if (options_ClampVehiclesToMap)
	{
		x = clamp(CameraX, x, CameraX + MapImageDrawSize)
		y = clamp(CameraY, y, CameraY + MapImageDrawSize)
	}

	if (v.team == 1)
		Context.fillStyle = "red";
	else
		Context.fillStyle = "blue";

	Context.save()
	Context.translate(x, y)
	Context.rotate(rot / 180 * Math.PI)
	Context.drawImage(VehicleMapIconList[v.mapImage][color], -11, -11, 22, 22)
	Context.restore()

	if (v.isFlyingVehicle && options_DrawVehicleHeight)
		Context.fillText((v.Y / 1000).toFixed(2) + "k", x - 8, y + 18)

	if (options_health_vehicles || HealthButtonDown)
		drawHealthBar(v, x, y)
}

function drawRally(i)
{
	const R = AllRallies[i]
	const x = XtoCanvas(R.X)
	const y = YtoCanvas(R.Z)


	if (R.team == 2)
	{
		if (!drawTeam2)
			return;
		Context.fillStyle = "blue"
	}
	else
	{
		if (!drawTeam1)
			return;
		Context.fillStyle = "red"
	}

	Context.beginPath()
	var radius = 6
	Context.arc(x, y, radius, 0, 2 * Math.PI)
	Context.fill()
	Context.stroke()

	Context.fillStyle = "green"
	Context.font = "bold " + 9 + "px arial";

	if (R.squad != 0)
		var text = R.squad
	else
		var text = "C"

	/* measureText only returns width so we have to guess the approximate height */
	var width = Context.measureText(text).width;
	var height = Context.measureText("C").width;

	Context.fillText(text, x - (width / 2), y + (height / 2))
}


function drawCache(i)
{
	const cache = AllCaches[i]
	const x = XtoCanvas(cache.X)
	const y = YtoCanvas(cache.Z)
	if (cache.revealed)
		Context.drawImage(icon_CacheRevealed, x-13, y-13, 26, 26)
	else
		Context.drawImage(icon_CacheUnrevealed, x-13, y-13, 26, 26)
}


function getStyle(Team, Squad)
{
	if (Team == 2)
		return opSquadColors[Squad]
	else
		return bluSquadColors[Squad]
}



//TODO rename this system to something more intuitive 
//A List of functions that return a boolean stating whether or not an animation is playing. Function can also "tick" the animations
var redrawNeededChecks = []
var redrawTimer = null
function redrawTimerStart()
{
	if (redrawTimer == null)
	{
		if (!isPlaying())
			drawCanvas()
		redrawTimer = setTimeout(redrawTimerTick, frameTime)
	}
}
function redrawTimerTick()
{
	redrawTimer = null
	var redrawNeeded = false
	for (var i=0;i<redrawNeededChecks.length;i++)
		if (redrawNeededChecks[i]())
			redrawNeeded =true
	
	
	if (redrawNeeded)
		redrawTimer = setTimeout(redrawTimerTick, frameTime)
		
	//Redraw anyways to "reset" the canvas even when no animations are playing(draw without animations)
	if (!isPlaying())
		drawCanvas()
}

function redrawIfNotPlaying()
{
	if (!isPlaying() && redrawTimer==null)
		drawCanvas()
}