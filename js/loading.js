"use strict";

//Loading order:
//
//0. Before everything:
//0.1 HideInterface() is called to hide all map related interface (playbar, map division, options, left bar)

//1. Icons, Map information JSON, Vehicle informaton JSON:
//1.1 loadIconsAndDictionaries() - Loads all icons and all json.
//1.2 When above done, stage1LoadingFininshed()
//
//2. Demo load deciding phase:
//2.1 if we have a "demo" Query string, Skip to 3
//2.2 Show the demo loading interface and wait for input
//

//3. Demo loading:
//3.1 loadDemo(URL) or loadDemoFromFile() are called depending on input.
//3.1a connectToServer() //TODO
//3.2 When above is done, stage3LoadingFininshed()

//4. Parser goes through the demo and the browser downloads the map assync.
//4.1 when done, stage4LoadingFininshed


//5 Create a copy of the map image and draws the DOD on top 
//	so we have 2 versions one with DoDs and one without (so we dont have to draw the DoD polygons from scratch every draw call.)
//5.1 When above is done ShowInterface() is called and loading is done


// Initial Loading.
$(()=>
{
	hideInterface()
	setLoadingOverlayText("Preparing to load icons...")
	Canvas = $("#map")[0]
	Context = Canvas.getContext("2d")
	mapDiv = $("#mapDiv")[0]
	
	// add onclick listeners to squad tables
	for (var i=1;i<=2;i++)
		for (var j=1;j<=9;j++)
		{
			$("#Squad" + i + j)[0].rows[0].onclick = 
			((ClosureI,ClosureJ) =>
			{
				return (() => {selection_SelectSquad(ClosureI, ClosureJ)})
			})(i,j)
		}
			

	// draw canvas on resize 
	window.onresize = function() {drawCanvas()}
	
	$("#demoFileSelection")[0].addEventListener('change', loadDemoFromFile);
	
	$("#playBar")[0].addEventListener("mouseenter", showPlayBarBubble);
	$("#playBar")[0].addEventListener("mouseleave", hidePlayBarBubble);
	$("#playBar")[0].addEventListener('mousemove',  setPlayBarBubble)
	
	
	loadIconsAndDictionaries()
	
	//$(document).tooltip() TODO
});



var MapsURL = "Maps/" 
var MapImage = null
var MapImageWithCombatArea = null


// Icons and data
var mapData
var atlas = null
var atlasPNG = null
var atlasJSON_loaded = false
var atlasPNG_loaded = false

//var weaponsData

var vehicleData
var icon_CacheUnrevealed
var icon_CacheRevealed

var ThingsLoading=1 //Amount of objects loading 
function loadIconsAndDictionaries()
{
	ThingsLoading++ //mapData loading
	$.getJSON("data/mapdata.json", json => {mapData = json;objectLoaded()})
	
	ThingsLoading++ //VehiclesData loading
	$.getJSON("data/vehicles.json", json => {vehicleData = json;objectLoaded()})
	
	ThingsLoading++ //atlas image loading
	atlasPNG = new Image()
	atlasPNG.onload = () =>
	{
		atlasPNG_loaded = true
		atlasLoaded()
		objectLoaded()
	}
	atlasPNG.src = "atlas.png"
	
	
	ThingsLoading++//atlas json loading
	$.getJSON("data/atlas.json", json =>
	{
		atlas = json;
		atlasJSON_loaded = true
		atlasLoaded()
		objectLoaded()
	})
	
	
	objectLoaded() //the entire function is considered "something" loading.
}

// Called when an icon has finished loading 
function objectLoaded()
{
	ThingsLoading--
	setLoadingOverlayText("Loading Icons... " + ThingsLoading + " Left")
	
	if (ThingsLoading ==0)
		stage1LoadingFininshed()
}

//Called when all icons are done loading. Now the demo needs to be selected or loaded.
function stage1LoadingFininshed()
{
	if (getUrlParameter("demo"))
		loadDemo(getUrlParameter("demo"), false)
	else
	{
		showDemoSelectionInterface()
		setLoadingOverlayText("")
	}
}

//load live Demo from active server
function loadLiveDemo(IP,Port,Username,Password)
{
	if (!WebSocket)
	{
		console.log("Raw TCP sockets are not supported on this browser")
		return false
	}
	
	network_connect(IP,Port,Username,Password,stage3LoadingFininshed, () => {}); //TODO some onerror callback
	//Wait for callback from onConnect and go to stage3 finished
}

//LoadDemo from URL
function loadDemo(link, CredsNeeded)
{
	if (link == "")
		return false
	
	//Manually set query string when loading from a URL
	if (history.pushState) 
	{
		var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname; //get base URL
		newurl += '?demo='+link  //set demo link
		
		//set hash
		newurl += window.location.hash;
		
		window.history.pushState({path:newurl},'',newurl);
	}
	
	setLoadingOverlayText("Preparing to load demo...")
	var req = new XMLHttpRequest();
	req.open('GET', link);
	
	req.withCredentials = CredsNeeded
	req.responseType = "arraybuffer";
	req.onload = () =>
	{
	
		if (req.status == 401)
		{
			Console.log("XMLHttpRequest returned 401, Trying again with 'withCredentials' flag set")
			return loadDemo(link, true)
		
		}
		
		if (req.status != 200 && req.status != 304)
		{
			setLoadingOverlayText("Error downloading demo file. Status code: "+req.status)
			return 
		}
		
		console.log("Request status: "+req.status)
		
		const buffer = req.response;
		
		//Set the global databuffer var (contains the file)
		DataBuffer = checkIfGZAndInflate(buffer);
		
		//Tell the message handler to cut the buffer into an array of dataviews of the buffer
		messageArrayObject.updateNewMessages()
		
		//All Messages parsed, call next stage
		stage3LoadingFininshed()
	}
	req.onprogress = e => 
	{
		const total = e.total ? Math.floor(e.total/1000) : "Unknown "
		setLoadingOverlayText("Loading Demo file... " + Math.floor(e.loaded / 1000) + "kb / " + total +"kb");
	}
	req.onerror= e => 
	{
		setLoadingOverlayText("Error downloading demo file. " + e)
	}
	
	req.send();
	return true
}



//Load demo from selected file
function loadDemoFromFile()
{
	var reader = new FileReader()
	reader.onloadend = () =>
	{
		DataBuffer = checkIfGZAndInflate(reader.result)
		messageArrayObject.updateNewMessages()
		stage3LoadingFininshed()
	}
	reader.readAsArrayBuffer($("#demoFileSelection")[0].files[0])
}



var isParsingDone=false
var isMapDownloadingDone = false

//Called when demo buffer is acquired.
function stage3LoadingFininshed()
{
	hideDemoSelectionInterface()
	setLoadingOverlayText("Loading map image... 0%")
	
	
	//Read up to server details message, update things like map name, layer, gamemode, team names.
	if (!isNetworking) //should be already available if we're networking and reached this function
		ReadServerDetails()
	
	//Load this map's image
	MapImage = new Image()
	MapImage.onprogress = updateLoadingStatus
	MapImage.onerror= () => setLoadingOverlayText("Error downloading map image.")
	MapImage.onload= () =>
	{
		isMapDownloadingDone = true
		updateLoadingStatus()
		if (isParsingDone) 
			setTimeout(stage4LoadingFininshed,5)
	}
	MapImage.load(MapsURL + MapName + ".png")
	
	bluforflag = FlagIconList[BluForTeam.toLowerCase() + "_cp.png"]
	opforflag = FlagIconList[OpForTeam.toLowerCase() + "_cp.png"]
	neutralflag = FlagIconList["neutral_cp.png"]
	
	// Parse the file and create checkpoints (while the map downloads!)
	if (!isNetworking)
		ParseDemo_Start()
	else
		ParseDemo_End() //Skip demo parsing for network mode
}



// Parse demo from start to end, count ticks and create checkpoints
// using hacks to make it assync because javascript is shit and there's no other way to force DOM update
function ParseDemo_Start()
{
	isFastForwarding = true
	messagePos = 0
	Tick_Count = 0
	
	ParseDemo_Part()
}
function ParseDemo_Part()
{
	for (var i=0; i<2500; i ++)
		if (!Update()) //if reached end of file, end
		{
			ParseDemo_End()
			return
		}
	
	//after parsing 500 ticks, sleep a little to let browser redraw UI
	updateLoadingStatus()
	setTimeout(ParseDemo_Part,5)
}
function ParseDemo_End()
{
	isFastForwarding = false;
	isParsingDone = true
	InitialParse = false
	updateLoadingStatus()
	if (isMapDownloadingDone)
		setTimeout(stage4LoadingFininshed,5)
}



var MapImageReady = false

//called when map downloading + demo parsing stage finishes
function stage4LoadingFininshed()
{
	createMapImageWithCombatArea()
	
	//Remove status overlay
	setLoadingOverlayText("")
	
	//Remove demo selection interface
	hideDemoSelectionInterface() 
	
	//Register keyboard events
	$(document).keydown(onKeyDown)
	$(document).keyup(onKeyUp)
	
	//Show the demo interface
	showInterface()
	
	
	
	MapImageReady = true; 
	
	Reset()
	
	//Load options from localStorage
	loadOptions()
	
	//Draw the canvas for the first time
	drawCanvas()
	
	//Reset speed to 1
	setSpeed(1)
	
	onLoad()
}


var GameModesEnum =
{
	gpm_cq : 1,
	gpm_insurgency : 2, 
	gpm_skirmish : 3,
	gpm_cnc : 4,
	gpm_vehicles : 5,
	gpm_objective : 6,
	gpm_coop : 7,
}

// TODO get all this data from the server (in the demo file) and get rid of all of this. This allows to easily add custom maps.
var CurrentLayerInformation = null
function loadLayerInformation()
{
	if (Layer == 0)
		console.log("Unknown layer!")
	
	CurrentLayerInformation = mapData.find((L) =>
	{
		const LayerInfo = L.LayerInfo
		return (LayerInfo.MapName == MapName &&
			(Layer == 0 || LayerInfo.Layer == Layer) &&
			LayerInfo.GameMode == GameModesEnum[GameMode])
	});
	
	if (!CurrentLayerInformation)
		console.log("Error loading layer information for " + MapName +","+Layer +","+GameMode)
	else
		MapSize = CurrentLayerInformation.LayerInfo.MapSize
}

function showDemoSelectionInterface()
{
	$("#DemoSelectionInterface")[0].style.display = "block";
}
function hideDemoSelectionInterface()
{
	$("#DemoSelectionInterface")[0].style.display = "none";
}




function onErrorLoading()
{
	//Planned: deal with 404/503
	console.log("Error loading item")
}

function unload()
{
	//planned. 
}


//misc
function hideInterface()
{
	$.each($(".hideAtStart"), (i,e) => {e.style.display = "none"})
}

function showInterface()
{
	$.each($(".hideAtStart"), (i,e) => {e.style.display = ""})
}


function updateLoadingStatus()
{
	const T1 = MapImage.completedPercentage == 100 ? "Done" : MapImage.completedPercentage + "%"
	const T2 = isParsingDone || isNetworking ? "Done" : Tick_Count
	setLoadingOverlayText("Loading map image and Parsing demo.<br> Map download: " + T1 + "<br>Ticks Parsed: "+T2)
}

function setLoadingOverlayText(Text)
{
	if (Text == "")
	{
		$("#loadingStatusOverlay")[0].style.display = "none"
	}
	else
	{
		$("#loadingStatusOverlay")[0].style.display = "block"
		$("#loadingStatusOverlay")[0].innerHTML = Text
	}
}


function checkIfGZAndInflate(demobuffer)
{
	var dataview = new Uint8Array(demobuffer)
	if(dataview[0] == 0x78 && //This is always true for GZ
	   dataview[1] == 0x9c)  //This marks the selected compression level. It will change if we change compression level. w/e good enough
	{
		console.log("Detected GZ, decompressing")
		return (new Zlib.Inflate(dataview)).decompress().buffer;
	}
	else
	{
		console.log("Not GZ")
		return demobuffer
	}
}


const fillstyle_neutral = "rgba(128, 128, 128, 0.4)";
const fillstyle_red = "rgba(255, 0, 0, 0.2)";
const fillstyle_blue = "rgba(0, 0, 255, 0.2)";
function createMapImageWithCombatArea()
{
	//The scaling functions used here rely on CameraX/Y zeroed
	var CameraXTemp = CameraX
	var CameraYTemp = CameraY
	CameraX = 0
	CameraY = 0
	
	const c = document.createElement('canvas');
	const context = c.getContext("2d")
	c.width = MapImage.width
	c.height = MapImage.height
	context.drawImage(MapImage,0,0)
	
	if (!CurrentLayerInformation)
		return

	var CAs = CurrentLayerInformation.CombatAreas
	
	CAs.forEach(function (CA)
	{
		if (!CA.Inverted) //todo
			return
		
		if (CA.Team == 0)
			context.fillStyle = fillstyle_neutral
		else if (CA.Team == 2)
			context.fillStyle = fillstyle_red
		else
			context.fillStyle = fillstyle_blue
		
		context.beginPath()
		CA.Points.forEach(function (Point)
		{
			const x = XtoCanvas(Point.X) *2
			const y = YtoCanvas(Point.Y) *2
			context.lineTo(x,y)
		})
		context.closePath()
		
		
		//if (!CA.inverted)
			//context.rect(0,0,MapImage.width,MapImage.height)
		
		context.fill()
	})
	
	MapImageWithCombatArea = new Image()
	MapImageWithCombatArea.src = c.toDataURL()
	
	CameraX =CameraXTemp
	CameraY =CameraYTemp
}

//Load settings from local storage
function loadOptions()
{
	for (var Name in localStorage) 
		if (Name.startsWith("options_"))
		{
			changeSetting(Name, JSON.parse(localStorage[Name]))
			if($("input[value='"+Name+"']")[0])
				$("input[value='"+Name+"']")[0].checked = window[Name]
		}
}

// Gets an image and returns an array of 4 images where white is replaced by [blue,red,green,white] (No efficient way of real time coloring on canvas?)
function colorImage(white)
{
	var c = document.createElement('canvas');
	var context = c.getContext("2d")
	c.width = white.width
	c.height = white.height
	
	
	context.drawImage(white,0,0)
	var blue = context.getImageData(0, 0, c.width, c.height)
	var red = context.getImageData(0, 0, c.width, c.height)
	var green = context.getImageData(0, 0, c.width, c.height)

	
	for (var i=0;i<blue.data.length;i+=4)
	{
		  // is white enough pixel (Some PR icons are not full white for some reason)
		  if(blue.data[i]>220 &&
			 blue.data[i+1]>220 &&
			 blue.data[i+2]>220
		)
		{
			// change to some colors 
			blue.data[i]=0;
			blue.data[i+1]=64;
			blue.data[i+2]=255;
			
			red.data[i]=255;
			red.data[i+1]=0;
			red.data[i+2]=0;
			
			green.data[i]=0;
			green.data[i+1]=255;
			green.data[i+2]=0;
		}
	}
	
	context.putImageData(blue,0,0)
	blue = new Image()
	blue.src = c.toDataURL()
	
	context.putImageData(red,0,0)
	red = new Image()
	red.src = c.toDataURL()
	
	context.putImageData(green,0,0)
	green = new Image()
	green.src = c.toDataURL()
	
	return [red, blue, green, white];
}