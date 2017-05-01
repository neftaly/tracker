$(() => $("#selection").dialog(
{
	close: selection_DeselectCurrent,
	containment: "#mainContainer",
	autoOpen: false,
	width: 310,
	height: "auto",
	resizable: false,
	title: "Selection",
	position:
	{
	},
}))


const SELECTED_NOTHING = -99999
// Currently selected player, to draw as white. takes priority over squad.
var SelectedPlayer = SELECTED_NOTHING
var SelectedVehicle = SELECTED_NOTHING
// Currently selected squad, to draw as green 
var SelectedSquadTeam = SELECTED_NOTHING
var SelectedSquadNumber = SELECTED_NOTHING

function selection_SelectPlayer(i, allowHighlight)
{
	var selectingSamePlayer = (i == SelectedPlayer)
	// Undo previous selection 
	// a vehicle is currently selected. mark all players as deselected and deselect the vehicle
	if (SelectedVehicle != SELECTED_NOTHING)
	{
		playerRow_PlayerDeselectAll()
		if (SelectedVehicle in vehicleTables)
			vehicleTables[SelectedVehicle].classList.remove("vehicleTable-selected")
	}

	// A player was selected before 
	else if (SelectedPlayer != SELECTED_NOTHING)
		if (SelectedPlayer in playerRows)
			playerRows[SelectedPlayer].classList.remove("player-row-selected")

	SelectedVehicle = SELECTED_NOTHING
	SelectedPlayer = SELECTED_NOTHING

	// New selection 
	if (i != SELECTED_NOTHING && i in AllPlayers)
	{
		var p = AllPlayers[i]
		// newly selected player is in a vehicle 
		if (p.vehicleid >= 0 && !isVehicleContainer(p.vehicleid))
		{
			SelectedVehicle = p.vehicleid

			// select all players in that vehicle 
			for (var player in AllPlayers)
				selection_CheckIfPlayerInSelectedVehicle(player)

			// select vehicle on vehicle table
			if (SelectedVehicle in vehicleTables)
				vehicleTables[SelectedVehicle].classList.add("vehicleTable-selected")
		}
		
		//highlight player
		if (!selectingSamePlayer && allowHighlight && p.X && p.Z)
			new highlight(p.X, p.Z)
		
		playerRows[i].classList.add("player-row-selected") //set row to selected
		SelectedPlayer = i

		$("#selection").dialog("open")
	}
	else
		$("#selection").dialog("close")

	selection_UpdateInformationBox()

	redrawIfNotPlaying()
}


// When clicking on a vehicle, for this release just select a passenger
function selection_SelectVehicle(i)
{
	const v = AllVehicles[i]
	
	if (v.Passengers.size == 0)
		console.log("Vehicle " + i + " is empty, but was selected")
	else
		selection_SelectPlayer(v.Passengers.values().next().value)
}


// Called on a every player that changed vehicle status to see if he's now in a selected vehicle
function selection_CheckIfPlayerInSelectedVehicle(i)
{
	const p = AllPlayers[i]

	if (p.vehicleid == SelectedVehicle)
		playerRows[i].classList.add("player-row-selected")
	else
		playerRows[i].classList.remove("player-row-selected")
}

function selection_SelectPlayersSquad(i)
{
	if (i != SELECTED_NOTHING && i in AllPlayers)
	{
		var p = AllPlayers[i]
		if (p.team != 0 && p.squad != 0)
			selection_SelectSquad(p.team, p.squad)
	}
}

function selection_SelectSquad(Team, Squad)
{
	// Deselect old squad
	if (SelectedSquadTeam != SELECTED_NOTHING)
	{
		var TableOld = $("#Squad" + SelectedSquadTeam + SelectedSquadNumber)[0]
		TableOld.classList.remove("scoreboard-squad-table-selected")
	}

	// Deselect current squad if selected again
	if (Team == SelectedSquadTeam && SelectedSquadNumber == Squad)
	{
		SelectedSquadTeam = SELECTED_NOTHING
		SelectedSquadNumber = SELECTED_NOTHING

	}
	// Select new squad
	else
	{
		$("#Squad" + Team + Squad)[0].classList.add("scoreboard-squad-table-selected")

		SelectedSquadTeam = Team
		SelectedSquadNumber = Squad
	}
	// Redraw map to color the squad
	redrawIfNotPlaying()
}

function selection_DeselectCurrent()
{
	selection_SelectPlayer(SELECTED_NOTHING)
}

// Rewrites the information box
function selection_UpdateInformationBox()
{
	const div = $("#selection")[0]
	div.innerHTML = ""

	// Vehicle is selected
	if (SelectedVehicle != SELECTED_NOTHING)
	{
		var node = vehicleTables[SelectedVehicle]
		if (node == null)
			return

		var clone = node.cloneNode(true)
		clone.className = "vehicleTable"
		div.appendChild(clone)
	}
	// If player is selected
	else if (SelectedPlayer != SELECTED_NOTHING)
	{
		var p = AllPlayers[SelectedPlayer]

		if (p.squad == 0)
		{
			if (p.isSquadLeader)
				div.innerHTML += "Commander"
			else
				div.innerHTML += "Unassigned"
		}
		else
		{
			div.innerHTML += "Squad " + p.squad
			if (p.isSquadLeader)
				div.innerHTML += " Leader"
		}
		div.innerHTML += "<br>" + p.name
		div.appendChild(KitIconList[p.kitImage].cloneNode(false))
		div.innerHTML += "<br>Height: " + p.Y
	}
}