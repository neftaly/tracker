"use strict";
//WARNNING do not dive in this file without https://docs.google.com/spreadsheets/d/1ArciEg1rkG_MHzSYWphje1s071a6kD2ojuD58nVmwAE/edit#gid=0

// "DataView" of the entire demo file 
var DataBuffer = null

// Amount of recording ticks in the file 
var Tick_Count = 0
// Current Tick 
var Tick_Current = 0

// Important functions and variables to call from drawing logic / GUI: 
// goTo(Tick) Go to a specific tick. Calls some UI updates
// drawCanvas() Redraw the canvas 
// Call Reset() to completely reset everything 
// Call loadDemo(URL) to load a PRDemo file from URL. Will call Reset() and update the map image according to the demo's header 
// Call Update() to advance by 1 recording tick. also update the variables below:	 // calls some UI updates depending on changes in the tick	


// AllPlayers: dictionary of all players by their id. Their object has a KitImage Icon field 
// AllVehicles: dictionary of all vehicles by their id. Their object has a Menu icon and Map Icon field 
// AllFobs: dictionary of all FoBs by their BF2 Object id 
// AllRallies: dictionary of all rallies by their Team and Squad, where the key equals ((Team - 1) * 128 + Squad)  
// AllFlags: dictionary of flags by their unique map-specific id. 
// These are also up to date at all times: 
var IPPort = ""
var ServerName = ""
var MaxPlayers = 0
var StartTime = 0
var RoundLength = 0
var MapName = ""
var GameMode = ""
var Layer = 64
var BluForTeam = ""
var OpForTeam = ""

var Tickets1 = 0
var Tickets2 = 0

const MESSAGETYPE = {
	SERVERDETAILS: 0x00,

	PLAYER_UPDATE: 0x10,
	PLAYER_ADD: 0x11,
	PLAYER_REMOVE: 0x12,

	VEHICLE_UPDATE: 0x20,
	VEHICLE_ADD: 0x21,
	VEHICLE_DESTROYED: 0x22,

	FOB_ADD: 0x30,
	FOB_REMOVE: 0x31,

	FLAG_UPDATE: 0x40,
	FLAG_LIST: 0x41,

	KILL: 0x50,
	CHAT: 0x51,

	TICKETS_TEAM1: 0x52,
	TICKETS_TEAM2: 0x53,

	RALLY_ADD: 0x60,
	RALLY_REMOVE: 0x61,
	
	CACHE_ADD: 0x70,
	CACHE_REMOVE: 0x71,
	CACHE_REVEAL: 0x72,
	INTEL_CHANGE: 0x73,
	
	REVIVE: 0xA0,
	KITALLOCATED: 0xA1,
	SQUADNAME: 0xA2,

	ROUNDEND: 0xf0,
	TICK: 0xf1,

	PRIVATEMESSAGE: 0xfd,
	ERRORMESSAGE: 0xfe,
};


var TIMESTEP = 0.04
var timeSinceRoundStart = 0 
function message_Tick(FullMessage)
{
	timeSinceRoundStart += FullMessage.getInt8(1) * TIMESTEP
}

// Dictionary of all players 
var AllPlayers = {}

function PlayerObject(_id)
{
	this.id = _id
	this.name = 'error!!!'
	this.isJoining = true
	this.isAlive = false
	this.squad = 0
	this.isSquadLeader = false
	this.vehicleid = -1
	this.vehicleSeatName = ""
	this.vehicleSlot = 0
	this.score = 0
	this.scoreTW = 0
	this.kills = 0
	this.deaths = 0
	this.ping = 0
	this.team = 0
	this.idle = 0
	this.kit = ""

	this.health = 0
	this.maxHealth = 100

	this.rotation = 0
	this.X = null
	this.Y = null
	this.Z = null

	this.kitImage = KitNameToImageDictionary["rifleman"] + ".png"

	//interpolation
	this.lastX = null
	this.lastZ = null
	this.Lastrotation = 0

	//Private data
	this.hash = null
	this.ip = null

	AllPlayers[this.id] = this
}

const PLAYERUPDATEFLAGS = {
	TEAM: 1,
	SQUAD: 2,
	VEHICLE: 4,
	HEALTH: 8,
	SCORE: 16,
	TEAMWORKSCORE: 32,
	KILLS: 64,
	TEAMKILLS: 128,
	DEATHS: 256,
	PING: 512,

	ISALIVE: 2048,
	ISJOINING: 4096,
	POSITION: 8192,
	ROTATION: 16384,
	KIT: 32768
}

// TODO put these in another module?
// On what changes should we rewrite the row
const playerUpdate_StatusChange = 
	PLAYERUPDATEFLAGS.VEHICLE +
	PLAYERUPDATEFLAGS.ISALIVE +
	PLAYERUPDATEFLAGS.KIT +
	PLAYERUPDATEFLAGS.KILLS +
	PLAYERUPDATEFLAGS.DEATHS +
	PLAYERUPDATEFLAGS.SQUAD

// When to move the playerrow
const playerUpdate_TeamOrSquadChange = 
	PLAYERUPDATEFLAGS.TEAM +
	PLAYERUPDATEFLAGS.SQUAD

// When to rewrite selection
const playerUpdate_SelectionInfoChange = 
	playerUpdate_StatusChange +
	PLAYERUPDATEFLAGS.POSITION


function PlayerUpdate(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		const flags = FullMessage.getUint16(pos, true);
		pos += 2

		const id = FullMessage.getUint8(pos)
		const Player = AllPlayers[id];
		pos++

		if (flags & PLAYERUPDATEFLAGS.TEAM)
		{
			Player.team = FullMessage.getInt8(pos++)
		}
		if (flags & PLAYERUPDATEFLAGS.SQUAD)
		{
			Player.squad = FullMessage.getUint8(pos++)

			Player.isSquadLeader = (Player.squad >= 128)
			Player.squad = Player.squad % 128
		}
		if (flags & PLAYERUPDATEFLAGS.VEHICLE)
		{
			RemovePlayerFromVehicle(id)
			onVehicleCrewChange(Player.vehicleid)
			Player.vehicleid = FullMessage.getInt16(pos, true)
			pos += 2
			if (Player.vehicleid >= 0)
			{
				Player.vehicleSeatName = getString(FullMessage, pos)
				pos += Player.vehicleSeatName.length + 1

				Player.vehicleSlot = FullMessage.getInt8(pos)
				pos+=1
			}

			AddPlayerToVehicle(id)
			onVehicleCrewChange(Player.vehicleid)
			onPlayerVehicleChange(id)
		}

		if (flags & PLAYERUPDATEFLAGS.HEALTH)
		{
			Player.health = FullMessage.getInt8(pos++, true);
		}

		if (flags & PLAYERUPDATEFLAGS.SCORE)
		{
			Player.score = FullMessage.getInt16(pos, true);
			pos += 2
		}

		if (flags & PLAYERUPDATEFLAGS.TEAMWORKSCORE)
		{
			Player.scoreTW = FullMessage.getInt16(pos, true);
			pos += 2
		}

		if (flags & PLAYERUPDATEFLAGS.KILLS)
		{
			Player.kills = FullMessage.getInt16(pos, true);
			pos += 2
		}

		if (flags & PLAYERUPDATEFLAGS.DEATHS)
		{
			Player.deaths = FullMessage.getInt16(pos, true);
			pos += 2
		}

		if (flags & PLAYERUPDATEFLAGS.PING)
		{
			Player.ping = FullMessage.getInt16(pos, true);
			pos += 2
		}
		if (flags & PLAYERUPDATEFLAGS.ISALIVE)
		{
			Player.isAlive = (FullMessage.getInt8(pos++) == 1);
		}
		if (flags & PLAYERUPDATEFLAGS.ISJOINING)
		{
			Player.isJoining = (FullMessage.getInt8(pos++) == 1);
		}
		if (flags & PLAYERUPDATEFLAGS.POSITION)
		{
			Player.X = FullMessage.getInt16(pos, true);
			Player.Y = FullMessage.getInt16(pos + 2, true);
			Player.Z = FullMessage.getInt16(pos + 4, true);
			pos += 6

		}
		if (flags & PLAYERUPDATEFLAGS.ROTATION)
		{
			Player.rotation = FullMessage.getInt16(pos, true);
			pos += 2
		}

		if (flags & PLAYERUPDATEFLAGS.KIT)
		{
			Player.kit = getString(FullMessage, pos)
			pos += Player.kit.length + 1
			
			if (Player.kit != "")
			{
				var KitSubName = Player.kit.split("_")[1]
				if (KitSubName in KitNameToImageDictionary)
					Player.kitImage = KitNameToImageDictionary[KitSubName] + ".png"
				else
					console.log("Parser: unknown kit name " + Player.kit)
			}
		}

		// Stop before the events calling if doing initial parse
		if (InitialParse)
			continue

		// Reset interpolation if alive changed
		if ((flags & PLAYERUPDATEFLAGS.ISALIVE) || isNaN(Player.lastX))
		{
			Player.lastX = Player.X
			Player.lastZ = Player.Z
		}

		// Call events for each player
		if (flags & playerUpdate_StatusChange)
			onPlayerStatusChanged(id)

		if (flags & playerUpdate_TeamOrSquadChange)
			onPlayerTeamOrSquadChange(id)

		// TODO get rid of this
		if (flags & playerUpdate_SelectionInfoChange)
			onPlayerSelectionInfoChange(id)
	}

}

function PlayerAdd(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		const id = FullMessage.getUint8(pos)
		pos += 1
		const p = new PlayerObject(id)

		p.name = getString(FullMessage, pos)
		pos += p.name.length + 1

		p.hash = getString(FullMessage, pos)
		pos += p.hash.length + 1

		p.ip = getString(FullMessage, pos)
		pos += p.ip.length + 1

		playerRow_Create(id)
	}
}

function PlayerRemove(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		const id = FullMessage.getUint8(pos++)

		RemovePlayerFromVehicle(id)
		onVehicleCrewChange(AllPlayers[id].vehicleid, id)

		onPlayerLeave(id)
		delete AllPlayers[id]
	}
}

function AddPlayerToVehicle(id)
{
	const Player = AllPlayers[id]
	if (Player.vehicleid in AllVehicles)
		AllVehicles[Player.vehicleid].Passengers.add(id)
}

function RemovePlayerFromVehicle(id)
{
	const Player = AllPlayers[id]
		// update old vehicle object
	if (Player.vehicleid in AllVehicles)
		AllVehicles[Player.vehicleid].Passengers.delete(id)
}

// -- Vehicles 
// Dictionary of vehicles 
var AllVehicles = {}

function VehicleObject(_id)
{
	this.id = _id
	this.name = ""
	this.team = 0
	this.rotation = 0
	this.X = 0
	this.Y = 0
	this.Z = 0

	this.isFlyingVehicle = false
	this.isClimbingVehicle = false

	this.menuImage = ""
	this.mapImage = "mini_shp_light.png"

	this.maxHealth = 0
	this.health = 0

	this.Passengers = new Set()

	// Get current players inside
	for (var i in AllPlayers)
	{
		const p = AllPlayers[i]
		if (p.vehicleid == this.id)
			this.Passengers.add(i)
	}

	this.lastX = NaN
	this.lastZ = NaN
	this.Lastrotation = 0
	
	//No Update received for this vehicle yet
	this.isNew = true
	
	AllVehicles[this.id] = this
}

var VEHICLEUPDATEFLAGS = {
	TEAM: 0x01,
	POSITION: 0x02,
	ROTATION: 0x04,
	HEALTH: 0x08,
}

function VehicleAdd(FullMessage)
{
	var pos = 1
	const id = FullMessage.getInt16(pos, true)
	pos += 2

	var CurrentVehicle
	if (id in AllVehicles)
		CurrentVehicle = AllVehicles[id]
	else
		CurrentVehicle = new VehicleObject(id)

	CurrentVehicle.name = getString(FullMessage, pos)
	pos += CurrentVehicle.name.length + 1

	CurrentVehicle.maxHealth = FullMessage.getUint16(pos, true)
	pos += 2

	CurrentVehicle.isClimbingVehicle = isClimbingVehicle(CurrentVehicle.name)
	if (!CurrentVehicle.isClimbingVehicle)
	{
		if (CurrentVehicle.name in vehicleData)
		{
			const data = vehicleData[CurrentVehicle.name]
			CurrentVehicle.mapImage = data.MiniMapIcon + ".png" //Map Image is a must
			if (data.MenuIcon != "")
				CurrentVehicle.menuImage = data.MenuIcon + ".png" //Menuimage is optional
		}
		else
			console.log("Parser: Vehicle Name not in dictionary: " + CurrentVehicle.name)
	}

	CurrentVehicle.isFlyingVehicle = isFlyingVehicle(CurrentVehicle.name)
	
}

function VehicleUpdate(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		const flags = FullMessage.getUint8(pos)
		pos++

		const id = FullMessage.getInt16(pos, true)
		pos += 2

		const CurrentVehicle = AllVehicles[id]

		//Debugging, This should never happen
		if (CurrentVehicle == null)
			console.log("Unknown vehicle " + id)

		if (flags & VEHICLEUPDATEFLAGS.TEAM)
		{
			CurrentVehicle.team = FullMessage.getInt8(pos++)
		}
		if (flags & VEHICLEUPDATEFLAGS.POSITION)
		{
			CurrentVehicle.X = FullMessage.getInt16(pos, true)
			CurrentVehicle.Y = FullMessage.getInt16(pos + 2, true)
			CurrentVehicle.Z = FullMessage.getInt16(pos + 4, true)
			pos += 6
		}
		if (flags & VEHICLEUPDATEFLAGS.ROTATION)
		{
			CurrentVehicle.rotation = FullMessage.getInt16(pos, true)
			pos += 2
		}

		if (flags & VEHICLEUPDATEFLAGS.HEALTH)
		{
			CurrentVehicle.health = FullMessage.getInt16(pos, true)
			pos += 2
		}
		
		
		if (isNaN(CurrentVehicle.lastX))
		{
			CurrentVehicle.lastX = CurrentVehicle.X
			CurrentVehicle.lastZ = CurrentVehicle.Z
		}
		
		// First update received for vehicle, do UI stuff
		if (CurrentVehicle.isNew)
		{
			CurrentVehicle.isNew = false
			if (!InitialParse)
				onNewVehicle(id)
		}
	}
}

// Reload passenger list of all vehicles. 
function RecheckAllVehicles()
{
	for (var vid in AllVehicles)
		AllVehicles[vid].Passengers = new Set()

	for (var id in AllPlayers)
	{
		const p = AllPlayers[id]

		if (p.vehicleid >= 0 && (p.vehicleid in AllVehicles))
			AllVehicles[p.vehicleid].Passengers.add(parseInt(id))
	}
}

// -- Flags 
var AllFlags = {}

function FlagObject(_id, _Team, _X, _Y, _Z, _radius)
{
	this.X = _X
	this.Y = _Y
	this.Z = _Z
	this.team = _Team
	this.id = _id
	this.Radius = _radius

	AllFlags[_id] = this
}

function FlagList(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		new FlagObject(
				FullMessage.getInt16(pos, true), // Unique ID
				FullMessage.getInt8(pos + 2), // Team (Starting)
				FullMessage.getInt16(pos + 3, true), // X
				FullMessage.getInt16(pos + 5, true), // Y
				FullMessage.getInt16(pos + 7, true), // Z
				FullMessage.getUint16(pos + 9, true)) // Radius
	
		pos += 11
	}
}

function FlagUpdate(FullMessage)
{
	AllFlags[FullMessage.getInt16(1, true)].team = FullMessage.getInt8(3)
}

// Tickets 
function Tickets_Team1(FullMessage)
{
	Tickets1 = FullMessage.getInt16(1, true)
}

function Tickets_Team2(FullMessage)
{
	Tickets2 = FullMessage.getInt16(1, true)
}

// Rallies 
var AllRallies = {}

function RallyObject(_TeamSquad, _X, _Y, _Z)
{
	this.team = Math.floor(_TeamSquad / 128) + 1
	this.squad = (_TeamSquad % 128)
	this.X = _X
	this.Y = _Y
	this.Z = _Z

	AllRallies[_TeamSquad] = this
}

function RallyAdd(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		new RallyObject(FullMessage.getUint8(pos), //(Team and Squad) 
			FullMessage.getInt16(pos+1,true), //X 
			FullMessage.getInt16(pos+3,true), //Y 
			FullMessage.getInt16(pos+5,true)) //Z 
		pos += 7 
	}
}

function RallyRemove(FullMessage)
{
	const TeamSquad = FullMessage.getUint8(1)
	if (TeamSquad in AllRallies)
		delete AllRallies[TeamSquad]
}


// -- Fobs 
var AllFobs = {}

function FoBObject(_id, _Team, _X, _Y, _Z)
{
	this.id = _id
	this.team = _Team
	this.X = _X
	this.Y = _Y
	this.Z = _Z

	AllFobs[_id] = this
}

function FoBAdd(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		new FoBObject(FullMessage.getInt32(pos,true), //Object ID 
					FullMessage.getInt8(pos+4),       //Team 
					FullMessage.getInt16(pos+5,true), //X 
					FullMessage.getInt16(pos+7,true), //Y 
					FullMessage.getInt16(pos+9,true)) //Z 
		pos += 11
	}
}

function FoBRemove(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		var _id = FullMessage.getInt32(pos, true)
		pos += 4
		if (_id in AllFobs)
			delete AllFobs[_id]
	}
}

// Caches
var AllCaches = {}

function CacheObject(id, X, Y, Z)
{
	this.id = id
	this.X = X
	this.Y = Y
	this.Z = Z
	this.revealed = false

	AllCaches[id] = this
}

function CacheAdd(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	
	while (pos != length)
	{
		const id = FullMessage.getUint8(pos,true)
		new CacheObject(id, //Cache ID (The module numbers them)
					FullMessage.getInt16(pos+1,true), //X 
					FullMessage.getInt16(pos+3,true), //Y 
					FullMessage.getInt16(pos+5,true)) //Z 
		pos+= 7
	}
}
function CacheReveal(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		const id = FullMessage.getUint8(pos,true)
		AllCaches[id].revealed = true
		pos+=1
	}
}
function CacheDestroyed(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		const id = FullMessage.getUint8(pos,true)
		delete AllCaches[id]
		pos+=1
	}
}

//Insurgency Intel
var intel = 0
function intelChanged(FullMessage)
{
	intel = FullMessage.getUint8(1,true)
}


var SquadNames = {}
function SquadName(FullMessage)
{
	var pos = 1
	const length = FullMessage.byteLength
	while (pos != length)
	{
		const teamsquad = FullMessage.getUint8(pos,true)
		const team = (teamsquad > 127) ? 2 : 1
		const squad = (teamsquad & 0x0F)
		pos+=1
		
		const name = getString(FullMessage, pos)
		pos += name.length + 1
		
		if (!(team in SquadNames))
			SquadNames[team] = {}
			
		if (!(squad in SquadNames[team]))
			SquadNames[team][squad] = {}
		SquadNames[team][squad] = name
		
		if (!InitialParse)
			onSquadNameChanged(team, squad, name)
	}
}

function getSquadName(team,squad)
{
	if (!(team in SquadNames))
		return ''
	if (!(squad in SquadNames[team]))
		return ''
	return SquadNames[team][squad]
}




const TICKSPERSAVE = 250
const TICKSJUMPMINIMUM = 350
var LatestState = -1
var isFastForwarding = false //Set to true to not do any UI updates when fast forwarding
function goTo(Tick_Target)
{
	// If its the same tick, do nothing 
	if (Tick_Target == Tick_Current)
		return
		// if the bar was dragged below first tick, load the first tick.
	if (Tick_Target < 1)
		Tick_Target = 1 
		// if its after the last tick, load the last state 
	if (Tick_Target >= Tick_Count)
		Tick_Target = Tick_Count - 1 

	// If its a forward tick, Check if we can shortcut by using a stored future state 
	if (Tick_Target > Tick_Current)
	{
		// If its close do not load any states 
		if (Tick_Target < Tick_Current + TICKSJUMPMINIMUM)
		{}

		//if latest state is before current, then loading will not help. Do nothing.
		else if (LatestState < Tick_Current)
		{}

		// Latest state is before target, load the latest to shortcut as much as possible 
		else if (LatestState < Tick_Target)
			loadState(LatestState);
		// Latest state is after target, load the one before the target 
		else
		{
			const SavedTick = Tick_Target - (Tick_Target % TICKSPERSAVE)
			loadState(SavedTick)
		}
	}
	// If its behind, load a state because we have it for sure (The only way to reach future ticks is to parse all the way to there at least once, which stores states) 
	else
	{
		const SavedTick = Tick_Target - (Tick_Target % TICKSPERSAVE)
		loadState(SavedTick)
	}

	isFastForwarding = true
	// Catch up to almost target tick
	while (Tick_Current < Tick_Target - 1)
		Update()

	isFastForwarding = false
	if (Tick_Current < Tick_Target) // If no updates are needed, the UI should be already updated from loading the state
		Update() // Do the last update with isFastForwarding false to cause UI update 

	onGoTo()

	if (!isPlaying())
		drawCanvas()
}

function loadState(SavedTick)
{
	if (SavedTick == 0)
	{
		Reset()
		return
	}

	const State = savedStates[SavedTick]
	AllPlayers = JSON.parse(State.AllPlayers)
	AllVehicles = JSON.parse(State.AllVehicles)
	AllFobs = JSON.parse(State.AllFobs)
	AllRallies = JSON.parse(State.AllRallies)
	AllFlags = JSON.parse(State.AllFlags)
	AllCaches = JSON.parse(State.AllCaches)
	SquadNames = JSON.parse(State.SquadNames)
	timeSinceRoundStart = JSON.parse(State.timeSinceRoundStart)
	
	
	Tickets1 = State.Tickets1
	Tickets2 = State.Tickets2
	intel = State.intel
	
	messagePos = State.messagePos

	killLines = JSON.parse(State.killLines)

	Tick_Current = SavedTick
	RecheckAllVehicles()
	
	for (var handler in eventArrays)
		eventArrays[handler].loadState(State)
	
	// Do UI things
	onLoadState()
}

var savedStates = {}

function saveState()
{
	const State = {
		AllPlayers: JSON.stringify(AllPlayers),
		AllVehicles: JSON.stringify(AllVehicles),
		AllFobs: JSON.stringify(AllFobs),
		AllRallies: JSON.stringify(AllRallies),
		AllFlags: JSON.stringify(AllFlags),
		AllCaches: JSON.stringify(AllCaches),
		SquadNames: JSON.stringify(SquadNames),
		
		timeSinceRoundStart: timeSinceRoundStart,
		
		Tickets1: Tickets1,
		Tickets2: Tickets2,
		intel: intel,
		
		messagePos: messagePos,
		
		iterators: {},
		
		killLines: JSON.stringify(killLines),
	}
	
	for (var handler in eventArrays)
		eventArrays[handler].saveState(State)
	
	savedStates[Tick_Current] = State
	LatestState = Tick_Current
}

function Reset()
{
	AllPlayers = {}
	AllVehicles = {}
	AllFobs = {}
	AllRallies = {}
	AllCaches = {}
	SquadNames = {}
	
	timeSinceRoundStart = 0
	
	Tickets1 = 0
	Tickets2 = 0

	messagePos = 0
	Tick_Current = 0
	
	for (var handler in eventArrays)
		eventArrays[handler].reset()
	
	
	playerRows = {}
	vehicleTables = {}

	// Parse up to the first tick (demo headers) 
	Update()

	onReset()
}


var InitialParse = true
// Run Messages until vehicle update (Which in current version is the last message of an update) 
// Call this to advance time by one tick 
function Update()
{
	// If not in counting phase and current tick is at the end and is not in network mode then stop
	if (Tick_Count == Tick_Current && !InitialParse)
	{
		if (isNetworking)
			return false
		else
		{
			Stop()
			Tick_Current = Tick_Count
			return false
		}
	}

	// Interpolation
	if (!isFastForwarding) // Do not interpolate when fast forwarding
	{
		for (var i in AllPlayers)
		{
			AllPlayers[i].Lastrotation = AllPlayers[i].rotation
			AllPlayers[i].lastX = AllPlayers[i].X
			AllPlayers[i].lastZ = AllPlayers[i].Z
		}
		for (var i in AllVehicles)
		{
			AllVehicles[i].Lastrotation = AllVehicles[i].rotation
			AllVehicles[i].lastX = AllVehicles[i].X
			AllVehicles[i].lastZ = AllVehicles[i].Z
		}
	}

	// Main message parsing loop, parse until tick message
	while (true)
	{
		// Get the next message from the messages array
		const FullMessage = messageArrayObject.getMessageAt(messagePos)
		if (FullMessage == null)
		{
			Stop()
			Tick_Current = Tick_Count
			return false
		}

		messagePos++
		const MessageType = FullMessage.getUint8(0);

		// Call the message handler
		messageHandlers[MessageType](FullMessage)

		// Only break when message type is end tick or end round
		if (MessageType == MESSAGETYPE.TICK || MESSAGETYPE == MessageType.ROUNDEND)
			break
	}

	// If this is the initial parse phase, count the ticks
	if (InitialParse)
		Tick_Count++


	// If we're doing initial parse or if this is live demo, save states.
	if (InitialParse || isNetworking)
	// Save once per X ticks, don't save if already exists, don't save for tick = 0
		if (Tick_Current % TICKSPERSAVE == 0 && !(Tick_Current in savedStates) && Tick_Current != 0)
			saveState()

	Tick_Current++

	// Call UI stuff
	onUpdate()
		//

	return true
}

const CURRENTVERSION = 3
var Version = -1
var DemoTimePerTick = 0.5
var briefingtime = 0
function ServerDetails(FullMessage)
{
	var pos = 1
	
	Version = FullMessage.getInt32(pos, true)
	pos += 4
	
	if (Version != CURRENTVERSION)
		console.log("Wrong version detected. Expected: "+CURRENTVERSION+", file is " + Version)
	
	
	
	DemoTimePerTick = FullMessage.getFloat32(pos, true)
	pos += 4

	IPPort = getString(FullMessage, pos)
	pos += IPPort.length + 1

	ServerName = getString(FullMessage, pos)
	pos += ServerName.length + 1

	MaxPlayers = FullMessage.getInt8(pos)
	pos++

	RoundLength = FullMessage.getInt16(pos, true)
	pos += 2

	briefingtime = FullMessage.getInt16(pos, true)
	pos += 2

	MapName = getString(FullMessage, pos)
	pos += MapName.length + 1

	GameMode = getString(FullMessage, pos)
	pos += GameMode.length + 1

	Layer = FullMessage.getUint8(pos)
	pos++

	OpForTeam = getString(FullMessage, pos)
	pos += OpForTeam.length + 1

	BluForTeam = getString(FullMessage, pos)
	pos += BluForTeam.length + 1
	
	StartTime = FullMessage.getInt32(pos, true)
	pos += 4
	
	Tickets1 = FullMessage.getInt16(pos, true)
	pos += 2

	Tickets2 = FullMessage.getInt16(pos, true)
	pos += 2

	if (CurrentLayerInformation == null)
		loadLayerInformation()
}

// DO NOT CALL AFTER INIT
// Read up to the serverdetails message
function ReadServerDetails()
{
	messagePos = 0
	while (true)
	{
		const Message = messageArrayObject.getMessageAt(messagePos++)
		if (Message == null)
			return false

		if (Message.getUint8(0) == MESSAGETYPE.SERVERDETAILS)
		{
			ServerDetails(Message)
			messagePos = 0
			return true
		}
	}
}

function roundEnd(FullMessage)
{
	Stop()
}

function unknownMessage(FullMessage)
{
	console.log("Received unknown message type " + FullMessage.getUint8(0))
}


// An object type that handles specific events. Each event will have his own instance.
// -On initial parse, the events are added into an array (sorted by when they happened)
// -Each array has an iterator pointing to the first event that didn't happen yet.
// -When playing the demo and receiving an event, advanced the iterator by one and call UI updating methods
// -Store the iterator value as part of the state so it can be loaded in loadState.
// -In network mode, there is no initial parse. Add the new event to the array only if the iterator has reached the end of the array 
// (we're parsing something that was never parsed before)
// Current events using this:
function eventArray(typeCode)
{
	this.typeCode = typeCode
	this.events = []
	this.iterator = 0 //Points to the first event that wasn't played yet
	
	// These are implemented per object
	this.onMessage = (FullMessage) => console.log("onMessage missing") //return an object representing the processed message
	this.onLoadState = (newIterator) => console.log("onLoadState missing") //(UI) Check what should be remarked
	this.onIteratorIncreasedByOne = (obj) => console.log("onIteratorIncreasedByOne missing") //(UI) Mark the new one as not future
	this.onNewEvent = (obj) => console.log("onNewEvent missing") //(UI) Write one event (For network mode, or done on initial parse)
	
	// These are same for all objects
	this.message = (FullMessage) => 
	{
		if (this.iterator == this.events.length) 
		{
			const event = this.onMessage(FullMessage)
			event.index = this.iterator
			event.tick = Tick_Current
			this.events[this.iterator] = event
			this.onNewEvent(event)
		}
		else
		{
			this.onIteratorIncreasedByOne(this.events[this.iterator])
		}
		this.iterator++
	}
	this.reset = () => 
	{
		this.iterator = 0
		this.onLoadState(0)
	}
	this.loadState = (state) =>
	{
		this.iterator = state.iterators[this.typeCode]
		this.onLoadState(this.iterator)
	}
	this.saveState = (state) =>
	{
		state.iterators[this.typeCode] = this.iterator
	}
	this.clear = () =>
	{
		this.events = []
		this.iterator = 0
	}
}

const eventArrays = {}
//Kills
$(() => 
{
	eventArrays.kills = new eventArray(MESSAGETYPE.KILL)
	eventArrays.kills.onMessage = (FullMessage) => 
	{
		const Attacker = FullMessage.getUint8(1)
		const Victim = FullMessage.getUint8(2)
		const Weapon = getString(FullMessage, 3)

		const obj = {
			isTeamkill: false,
			Weapon: Weapon,
			AttackerName: "???",
			VictimName: "???",
			AttackerID: Attacker,
			VictimID: Victim,
			Distance: "???",
			AttackerX: NaN,
			VictimX: NaN,
			AttackerY: NaN,
			VictimY: NaN,
			X: NaN,
			Y: NaN,
		}
		
		const AttackerObj = AllPlayers[Attacker]
		const VictimObj = AllPlayers[Victim]
		
		//Save the important parts of the state of the player as they were when the kill was made
		if (AttackerObj != null)
		{
			obj.AttackerName = AttackerObj.name
			obj.AttackerTeam = AttackerObj.team
			obj.AttackerSquad = AttackerObj.squad
		}
		else
			console.log("Received Attacker ID of invalid player")

		if (VictimObj != null)
		{
			obj.VictimName = VictimObj.name
			obj.VictimTeam = VictimObj.team
		}
		else
			console.log("Received Victim ID of invalid player")

		if (AttackerObj != null && VictimObj != null)
		{
			const x1 = AttackerObj.X
			const x2 = VictimObj.X
			const y1 = AttackerObj.Z
			const y2 = VictimObj.Z

			obj.AttackerX = x1
			obj.VictimX = x2
			obj.X = x2
			obj.AttackerY = y1
			obj.VictimY = y2
			obj.Y = y2

			obj.Distance = Math.round(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)))
			obj.isTeamkill = AttackerObj.team == VictimObj.team
		}
			
		return obj
	}
	eventArrays.kills.onNewEvent = (obj) => {eventDialogs.kills.newEvent(obj)}
	eventArrays.kills.onIteratorIncreasedByOne = (obj) =>  {killLine_Add(obj);eventDialogs.kills.enableOne()}
	eventArrays.kills.onLoadState = (i) => {eventDialogs.kills.reenable(i)}
}) 

//Revives
$(() => 
{
	eventArrays.revives = new eventArray(MESSAGETYPE.REVIVE)
	eventArrays.revives.onMessage = (FullMessage) => 
	{
		const medic = FullMessage.getUint8(1)
		const revived = FullMessage.getUint8(2)

		const medicObj = AllPlayers[medic]
		const revivedObj = AllPlayers[revived]

		const obj = {
			MedicName: "???",
			RevivedName: "???",
			MedicID: medic,
			RevivedID: revived,
			Team: 0,
			X: NaN,
			Y: NaN,
		}

		if (medicObj != null)
		{
			obj.MedicName = medicObj.name
			obj.Team = medicObj.team
			obj.X = medicObj.X
			obj.Y = medicObj.Z
			
		}
		else
			console.log("Received Medic ID of invalid player")

		if (revivedObj != null)
			obj.RevivedName = revivedObj.name
		else
			console.log("Received Revived ID of invalid player")
			
		return obj
	}
	eventArrays.revives.onNewEvent = (obj) => eventDialogs.revives.newEvent(obj)
	eventArrays.revives.onIteratorIncreasedByOne = () => eventDialogs.revives.enableOne()
	eventArrays.revives.onLoadState = (i) => {eventDialogs.revives.reenable(i)}
})

//Vehicles Destroyed
$(() => 
{
	eventArrays.vehicleDestroyers = new eventArray(MESSAGETYPE.VEHICLE_DESTROYED)
	eventArrays.vehicleDestroyers.onMessage = (FullMessage) => 
	{
		const vehicleID = FullMessage.getInt16(1, true)
		const vehicle = AllVehicles[vehicleID]
		delete AllVehicles[vehicleID]
		
		const playerKnown = (FullMessage.getUint8(3) != 0)
		const playerID = FullMessage.getUint8(4)
		const player = playerKnown ? AllPlayers[playerID] : null
		
		var obj = {
			vehicleID: vehicleID,
			vehicleX: NaN,
			vehicleY: NaN,
			vehicleTemplate: "???",
			vehicleTeam: 0,
			destroyerName: "???",
			destroyerTeam: 0,
			destroyerX: NaN,
			destroyerY: NaN,
			destroyerID: playerID,
		}
		if (playerKnown && player)
		{
			obj.destroyerX = player.X
			obj.destroyerY = player.Z
			obj.destroyerName = player.name
			obj.destroyerTeam = player.team
		}
		if (vehicle)
		{
			obj.vehicleX = vehicle.X
			obj.vehicleY = vehicle.Z
			obj.vehicleTemplate = vehicle.name
			obj.vehicleTeam = vehicle.team
		}
		return obj
	}
	
	
	eventArrays.vehicleDestroyers.onNewEvent = (obj) => eventDialogs.vehicleDestroyers.newEvent(obj)
	eventArrays.vehicleDestroyers.onIteratorIncreasedByOne = (obj) => {delete AllVehicles[obj.vehicleID];onVehicleDestroyed(obj.vehicleID);eventDialogs.vehicleDestroyers.enableOne()}
	eventArrays.vehicleDestroyers.onLoadState = (i) => {eventDialogs.vehicleDestroyers.reenable(i)}
})


//Chat
const CHATCHANNELS = 
{
	0x00 : "AllChat",  // - AllChat
	0x10 : "Team1", // - Team 1 chat.
	0x20 : "Team2",  // - Team 2 chat.
	0x30 : "Server",
	0x31 : "Response",
	0x32 : "AdminAlert",
	0x33 : "Server Message",
	0x34 : "Server Team1 Message",
	0x35 : "Server Team1 Message",
}
$(() => 
{
	
	eventArrays.chat = new eventArray(MESSAGETYPE.CHAT)
	eventArrays.chat.onMessage = (FullMessage) => 
	{
		const channel = FullMessage.getUint8(1)
		const playerID = FullMessage.getUint8(2)
		
		var speakerName
		var team = 0
		//Anything below 0x30 is player channels
		if (channel < 0x30)
		{
			speakerName = AllPlayers[playerID] ? AllPlayers[playerID].name : "Unknown Player"
			team = AllPlayers[playerID] ? AllPlayers[playerID].team : 0
		}
		else
			speakerName = ""
		
		const text = getString(FullMessage, 3)
		const obj = 
		{
			text: text,
			playerID: playerID,
			speaker: speakerName,
			channel: channel,
			team: team,
		}
		
		return obj
	}
	eventArrays.chat.onNewEvent = (obj) => {eventDialogs.chat.newEvent(obj)}
	eventArrays.chat.onIteratorIncreasedByOne = (obj) => {eventDialogs.chat.enableOne()}
	eventArrays.chat.onLoadState = (i) => {eventDialogs.chat.reenable(i)}
})

//Kits
$(() => 
{
	eventArrays.kitAllocations = new eventArray(MESSAGETYPE.KITALLOCATED)
	eventArrays.kitAllocations.onMessage = (FullMessage) => 
	{
		const playerID = FullMessage.getUint8(1)
		const kitName = getString(FullMessage, 2)
		const playerName = AllPlayers[playerID] ? AllPlayers[playerID].name : "Unknown Player!"
		const team = AllPlayers[playerID] ? AllPlayers[playerID].team : 0
		
		const obj = 
		{
			playerID: playerID,
			playerName: playerName,
			team: team,
			kitName: kitName,
		}
		
		return obj
	}
	eventArrays.kitAllocations.onNewEvent = (obj) => {eventDialogs.kitAllocations.newEvent(obj)}
	eventArrays.kitAllocations.onIteratorIncreasedByOne = (obj) => {eventDialogs.kitAllocations.enableOne()}
	eventArrays.kitAllocations.onLoadState = (i) => {eventDialogs.kitAllocations.reenable(i)}
})

var messagePos = 0
var messageArrayObject
$(() => messageArrayObject = new messageArray()) 
function messageArray()
{
	this.messages = []
	this.pos = 0

	this.getMessageAt = function (i)
	{
		if (this.messages.length > i)
			return this.messages[i]
		else
			return null
	}

	this.getNextMessage = function ()
	{
		var databuffer
		var endOfBuffer
		if (isNetworking)
		{
			databuffer = network_Buffer
			endOfBuffer = network_BufferWritePos
		}
		else
		{
			databuffer = DataBuffer
			endOfBuffer = DataBuffer.byteLength
		}

		// Enough bytes for length?
		if (this.pos + 2 > endOfBuffer)
			return null // End of file reached

		const LengthBytes = new DataView(databuffer, this.pos, 2);
		const Length = LengthBytes.getInt16(0, true);

		if (Length == 0)
			return null

		// Enough bytes for message itself?
		if (this.pos + 2 + Length > endOfBuffer)
			return null // Error, unexpected end of file

		const message = new DataView(databuffer, this.pos + 2, Length)

		this.pos += 2 + Length
		return message
	}

	// Update the messages var
	this.updateNewMessages = function ()
	{
		var message = this.getNextMessage()
		while (message != null)
		{
			this.addMessage(message)
			message = this.getNextMessage()
		}
	}

	this.addMessage = function (message)
	{
		this.messages.push(message)
	}
}


// Finds the next null character and returns a string from offset to it
function getString(message, offset)
{
	var text = ''
	while (offset < message.byteLength)
	{
		const val = message.getUint8(offset++);
		if (val == 0) break;
		text += String.fromCharCode(val);
	}
	return text
}

function getStringToEndOfMessage(message, offset)
{
	var text = ''
	while (offset < message.byteLength)
	{
		const val = message.getUint8(offset++);
		text += String.fromCharCode(val);
	}
	return text
}

// Utility functions
// Returns false when vehicle is a climbing vehicle, or parachute vehicle, or any other container, or when invalid
function isVehicleContainer(VehicleID)
{
	const v = AllVehicles[VehicleID]
	return (v == null || v.isClimbingVehicle || v.name.includes("_uav_"))
}

function isFlyingVehicle(vehicleName)
{
	return vehicleName.includes("_the_") ||
		vehicleName.includes("_ahe_") ||
		vehicleName.includes("_jet_") ||
		vehicleName.startsWith("spectator")
}

function isClimbingVehicle(vehicleName)
{
	return vehicleName == "grapplinghookropecontainer" ||
		vehicleName == "laddercontainer" ||
		vehicleName == "parachute"

}



var messageHandlers = []
$(() =>
{
	for (var i = 0; i < 256; i++)
		messageHandlers[i] = unknownMessage

	//Map message types to handlers
	messageHandlers[MESSAGETYPE.SERVERDETAILS] = ServerDetails

	messageHandlers[MESSAGETYPE.PLAYER_UPDATE] = PlayerUpdate
	messageHandlers[MESSAGETYPE.PLAYER_ADD] = PlayerAdd
	messageHandlers[MESSAGETYPE.PLAYER_REMOVE] = PlayerRemove

	messageHandlers[MESSAGETYPE.VEHICLE_UPDATE] = VehicleUpdate
	messageHandlers[MESSAGETYPE.VEHICLE_ADD] = VehicleAdd
	messageHandlers[MESSAGETYPE.VEHICLE_DESTROYED] = eventArrays.vehicleDestroyers.message

	messageHandlers[MESSAGETYPE.FLAG_LIST] = FlagList
	messageHandlers[MESSAGETYPE.FLAG_UPDATE] = FlagUpdate

	messageHandlers[MESSAGETYPE.RALLY_ADD] = RallyAdd
	messageHandlers[MESSAGETYPE.RALLY_REMOVE] = RallyRemove

	messageHandlers[MESSAGETYPE.KILL] = eventArrays.kills.message

	messageHandlers[MESSAGETYPE.FOB_ADD] = FoBAdd
	messageHandlers[MESSAGETYPE.FOB_REMOVE] = FoBRemove

	messageHandlers[MESSAGETYPE.TICKETS_TEAM1] = Tickets_Team1
	messageHandlers[MESSAGETYPE.TICKETS_TEAM2] = Tickets_Team2

	messageHandlers[MESSAGETYPE.CHAT] = eventArrays.chat.message
	
	messageHandlers[MESSAGETYPE.CACHE_ADD] = CacheAdd
	messageHandlers[MESSAGETYPE.CACHE_REMOVE] = CacheDestroyed
	messageHandlers[MESSAGETYPE.CACHE_REVEAL] = CacheReveal
	messageHandlers[MESSAGETYPE.INTEL_CHANGE] = intelChanged
	
	messageHandlers[MESSAGETYPE.REVIVE] = eventArrays.revives.message
	messageHandlers[MESSAGETYPE.KITALLOCATED] = eventArrays.kitAllocations.message
	messageHandlers[MESSAGETYPE.SQUADNAME] = SquadName
	
	messageHandlers[MESSAGETYPE.ROUNDEND] = Stop


	messageHandlers[MESSAGETYPE.TICK] = message_Tick
})