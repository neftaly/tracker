// Kill Lines

//TODO make the line point to target
//TODO make the line different if its a bleed-out (weapon = "Killed")

var killLines = []

const FadeAmountPerTick = 0.025
const FadeTicks = 40

var SelectedKill = SELECTED_NOTHING


function killLine_Add(kill)
{
	killLines.push(kill)
}

function killLine_RemoveOld()
{
	killLines = killLines.filter(killLine_ShouldKeep)
}

// used to filter the array of killlines
function killLine_ShouldKeep(Kill)
{
	// keep if:
	//	-we're after the kill's tick
	//	-it hasn't been FadeTicks ticks yet since the kill.
	return (((Tick_Current - Kill.tick) <= FadeTicks) && (Tick_Current >= Kill.tick))
}

function killLine_Draw(Kill)
{
	Context.save()

	const Atk = AllPlayers[Kill.AttackerID]
	const Vic = AllPlayers[Kill.VictimID]

	if (Atk == null || Vic == null)
		return

	var Fade = 1 - (Tick_Current - Kill.tick) * FadeAmountPerTick
	Context.globalAlpha = Math.max(Fade, 0)



	var x1 = XtoCanvas(interpolate(Atk.lastX, Atk.X))
	var y1 = YtoCanvas(interpolate(Atk.lastZ, Atk.Z))
	// No point in interpolating a dead body
	var x2 = XtoCanvas(Vic.X)
	var y2 = YtoCanvas(Vic.Z)
	drawLine(x1, x2, y1, y2, Atk.team, Atk.squad)

	// restore the context to avoid having globalAlpha blur out all the objects on the canvas
	Context.restore()
}

// Draws from a "kill" object (using the global var SelectedKill), no fade
function killLine_DrawSelected()
{
	Context.lineWidth = 5;
	Context.beginPath()
	var kill = eventArrays.kills.events[SelectedKill]
	if (kill == null)
		return

	var Atk = AllPlayers[kill.Attacker]
	var x1 = XtoCanvas(kill.AttackerX)
	var y1 = YtoCanvas(kill.AttackerY)
	var x2 = XtoCanvas(kill.VictimX)
	var y2 = YtoCanvas(kill.VictimY)

	drawLine(x1, x2, y1, y2, kill.AttackerTeam, kill.AttackerSquad)
}


function drawLine(x1, x2, y1, y2, Team, Squad)
{
	Context.beginPath()
	Context.moveTo(x1, y1);
	Context.lineTo(x2, y2);

	if (Team)
		Context.strokeStyle = getStyle(Team, Squad)

	Context.lineWidth = 7;
	Context.stroke()


	if (Team == 1)
		Context.strokeStyle = Style_RedTeam
	else
		Context.strokeStyle = Style_BlueTeam
	Context.lineWidth = 4;
	Context.stroke()
}