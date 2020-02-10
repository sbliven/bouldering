/* Add a new hold div to the specified target div
 *
 * target (HTMLElement): target div
 * x,y (float): fractional (0 to 1) position of the hold within the image
 * properties: dictionary with other optional properties
 */
function addHold(target, x, y, properties) {
    const targetBounds = target.querySelector("img").getBoundingClientRect();

    var width = targetBounds.width,
        height = targetBounds.height;

    // On page load, the target may not be sized yet, but it should have a child image
    if(width <= 0) {
        var img = target.querySelector("img");
        width = img.width;
        console.log(`bounds: ${targetBounds.width}, img: ${img.width}`);
    }
    if(height <= 0) {
        var img = target.querySelector("img");
        height = img.height;
        console.log(`bounds: ${targetBounds.height}, img: ${img.height}`);
    }

    var xcoord = x*width - 12,
        ycoord = y*height - 12;
    var hold = document.createElement("div");
    hold.className = "hold";
    hold.style.left = xcoord + "px";
    hold.style.top = ycoord + "px";

    var holdContent = document.createElement("div")
    holdContent.className = "holdLabel";
    if("label" in properties) {
        holdContent.innerHTML = properties.label;
    }
    hold.appendChild(holdContent);

    if("color" in properties) {
        //hold.style.backgroundColor = properties.color;
        hold.style.borderColor = properties.color;
        holdContent.style.color = properties.color;
    }

    if("key" in properties) {
        hold.setAttribute("data-key", properties["key"]);
        hold.addEventListener("mouseover", () => hoverRoute(target, properties.key));
        hold.addEventListener("mouseout", () => unhoverRoute(target, properties.key));
    }

    target.appendChild(hold);
    return hold;
}

function loadRoutes(target, key, routes) {
    console.log("Loaded "+routes.length+" routes")
    // first, assign unique key to each route
    for(var i = 0; i<routes.length; i++) {
        routes[i]["key"] = "route"+i;
    }
    routes.forEach((route) => {
        for(var i=0;i<route.x.length; i++) {
            properties = {}
            Object.assign(properties, route);
            if( ("includeStart" in properties && !properties.includeStart && i ==0) ||
                (0 < i && i < route.x.length-1) ||
                ("includeEnd" in properties && !properties.includeEnd && i == route.x.length-1)) {
                // only label endpoints
                delete properties['label'];
            }
            addHold(target, route.x[i], route.y[i], properties);
        }
    });
}

const colorCache = {}
function colorToRGBA(color) {
    // Returns the color as an array of [r, g, b, a] -- all range from 0 - 255
    // color must be a valid canvas fillStyle. This will cover most anything
    // you'd want to use.
    // Examples:
    // colorToRGBA('red')  # [255, 0, 0, 255]
    // colorToRGBA('#f00') # [255, 0, 0, 255]
    // https://stackoverflow.com/a/24390910/81658
    if(!(color in colorCache)) {
        var cvs, ctx;
        cvs = document.createElement('canvas');
        cvs.height = 1;
        cvs.width = 1;
        ctx = cvs.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        var rgba = ctx.getImageData(0, 0, 1, 1).data;
        if(typeof color === 'string') {
            colorCache[color] = rgba;
        } else {
            return rgba;
        }
    }
    return colorCache[color];
}
// https://stackoverflow.com/a/6511606/81658
function contrastingColor(color)
{
    return (luma(color) >= 165) ? '#000' : '#fff';
}
function luma(color) // color can be a hx string or an array of RGB values 0-255
{
    var rgb = (typeof color === 'string') ? colorToRGBA(color) : color;
    return (0.2126 * rgb[0]) + (0.7152 * rgb[1]) + (0.0722 * rgb[2]); // SMPTE C, Rec. 709 weightings
}

function addLegend(map, routes) {
    const legend = document.createElement("div");
    legend.className = "legend";

    const allBlock = document.createElement("div");
    allBlock.className = "legendBlock allBlock";
    allBlock.innerText = "All";
    allBlock.addEventListener("click", () => toggleAllRoutes(map));
    legend.appendChild(allBlock);

    routes.forEach((properties) => {
        const block = document.createElement("div");
        block.className = "legendBlock";
        block.setAttribute("data-key", properties.key);

        if("label" in properties) {
            block.innerText = properties.label;
        }

        if("color" in properties) {
            block.style.backgroundColor = properties.color;
            block.style.color = contrastingColor(properties.color);
        }

        block.addEventListener("mouseover", () => hoverRoute(map, properties.key));
        block.addEventListener("mouseout", () => unhoverRoute(map, properties.key));

        block.addEventListener("click", () => toggleRoute(map, properties.key));

        legend.appendChild(block);
    });
    map.appendChild(legend);
}

function hoverRoute(routeMap, holdKey) {
    console.log(`hover ${holdKey}`);
    routeMap.querySelectorAll(`.hold[data-key="${holdKey}"]`).forEach((d) => {
        d.classList.add("hover");
    });
    routeMap.querySelectorAll(`.legendBlock[data-key="${holdKey}"]`).forEach((d) => {
        d.classList.add("hover");
    });
}

function unhoverRoute(routeMap, holdKey) {
    console.log(`unhover ${holdKey}`);
    routeMap.querySelectorAll(`.hold[data-key="${holdKey}"]`).forEach((d) => {
        d.classList.remove("hover");
    });
    routeMap.querySelectorAll(`.legendBlock[data-key="${holdKey}"]`).forEach((d) => {
        d.classList.remove("hover");
    });
}

function setAllRoutes(routeMap) {
    routeMap.querySelectorAll('.hold').forEach((d) => {
        d.classList.add("active")
    });
    routeMap.querySelectorAll('.legendBlock').forEach((d) => {
        d.classList.add("active")
    });

}
function resetRoutes(routeMap) {
    routeMap.querySelectorAll('.hold').forEach((d) => {
        d.classList.remove("active")
        d.classList.remove("hover")
    });
    routeMap.querySelectorAll('.legendBlock').forEach((d) => {
        d.classList.remove("active")
        d.classList.remove("hover")
    });
}

/* Respond to 'All' button clicks.
 * If all are active, deactivate everything.
 * If not all are active, activate everything.
 */
function toggleAllRoutes(routeMap) {
    const allBlock = routeMap.querySelector('.allBlock'),
        active = allBlock.classList.contains("active");
    if(active) {
        allBlock.classList.remove("active");
        routeMap.querySelectorAll('.hold, .legendBlock').forEach((h) => {
            h.classList.remove("active");
        });
    } else {
        allBlock.classList.add("active");
        routeMap.querySelectorAll('.hold, .legendBlock').forEach((h) => {
            h.classList.add("active");
        });
    }
}

function toggleRoute(routeMap, holdKey) {
    const legend = routeMap.querySelector(`.legendBlock[data-key="${holdKey}"]`),
        active = legend.classList.contains("active");
    if(active) {
        legend.classList.remove("active");
        routeMap.querySelectorAll(`.hold[data-key="${holdKey}"]`).forEach((h) => {
            h.classList.remove("active");
        });
        routeMap.querySelector(".allBlock").classList.remove("active");
    } else {
        legend.classList.add("active");
        routeMap.querySelectorAll(`.hold[data-key="${holdKey}"]`).forEach((h) => {
            h.classList.add("active");
        });
    }
}

function sortRoutes(routes) {
    function byX(a, b) {
        return a.x[0] - b.x[0];
    }
    for(key in routes) {
        routes[key].sort(byX);
    }
}