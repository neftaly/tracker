"use strict;"

var atlascontext

function atlasLoaded()
{
	if (!(atlasJSON_loaded && atlasPNG_loaded))
		return

	// Draw the atlas on a temp canvas
	var c = document.createElement('canvas');
	c.width = 4096
	c.height = 33
	atlascontext = c.getContext("2d")
	atlascontext.drawImage(atlasPNG, 0, 0)

	for (var Name in KitIconList)
	{
		ThingsLoading++
		KitIconList[Name] = new Image()
		KitIconList[Name].onload = objectLoaded
		KitIconList[Name].src = loadImageFromAtlas(Name)
	}

	for (var Name in VehicleMenuIconList)
	{
		ThingsLoading++
		VehicleMenuIconList[Name] = new Image()
		VehicleMenuIconList[Name].onload = objectLoaded
		VehicleMenuIconList[Name].src = loadImageFromAtlas(Name)
	}

	for (var Name in VehicleMapIconList)
	{
		var Temp = new Image()

		// This creates a proper closure. See http://javascriptissexy.com/understand-javascript-closures-with-ease/ Section 3.
		Temp.onload =
			((ClosureName, ClosureTemp) =>
			{
				return (() =>
				{
					VehicleMapIconList[ClosureName] = colorImage(ClosureTemp);
					objectLoaded()
				})
			})(Name, Temp)

		Temp.onerror = onErrorLoading
		ThingsLoading++
		Temp.src = loadImageFromAtlas(Name)
	}
	for (var Name in FlagIconList)
	{
		ThingsLoading++
		FlagIconList[Name] = new Image()
		FlagIconList[Name].onload = objectLoaded
		FlagIconList[Name].src = loadImageFromAtlas(Name)
	}
	
	ThingsLoading++
	icon_CacheUnrevealed = new Image()
	icon_CacheUnrevealed.onload = objectLoaded
	icon_CacheUnrevealed.src = loadImageFromAtlas("CacheUnrevealed.png")
	
	ThingsLoading++
	icon_CacheRevealed = new Image()
	icon_CacheRevealed.onload = objectLoaded
	icon_CacheRevealed.src = loadImageFromAtlas("CacheRevealed.png")
}

// Converts to image blob from "ImageData". a bit inefficient, but that's all javascript gives me.
function loadImageFromAtlas(Name)
{
	const atlasPoint = atlas[Name]
	if (!atlasPoint)
	{
		console.log("Unknown atlas key"+Name)
		return
	}

	const XPos = atlasPoint[0]
	const sizex = atlasPoint[1]
	const sizey = atlasPoint[2]
	const imagedata = atlascontext.getImageData(XPos, 0, sizex, sizey)

	var tempcanvas = document.createElement('canvas')
	tempcanvas.width = sizex
	tempcanvas.height = sizey

	var tempcontext = tempcanvas.getContext("2d")
	tempcontext.putImageData(imagedata, 0, 0)

	return tempcanvas.toDataURL()
}