/*
*    main.js
*    CoinStats
*/

var margin = { left:80, right:100, top:50, bottom:100 },
    height = 500 - margin.top - margin.bottom, 
    width = 800 - margin.left - margin.right;

var svg = d3.select("#chart-area").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);
var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + 
        ", " + margin.top + ")");

var t = () => { return d3.transition().duration(1000)}

// Time parser for x-scale
var parseTime = d3.timeParse("%d/%m/%Y");
var formatTime = d3.timeFormat("%d/%m/%Y")
// For tooltip
var bisectDate = d3.bisector(function(d) { return d.date; }).left;

// add the line for the first time
g.append("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", "1px")

// labels
var xLabel = g.append("text")
    .attr("class", "x axisLabel")
    .attr("y", height + 50)
    .attr("x", width / 2)
    .attr("font-size", "16px")
    .attr("text-anchor", "middle")
    .text("Time")
var yLabel = g.append("text")
    .attr("class", "y axisLabel")
    .attr("transform", "rotate(-90)")
    .attr("y", -60)
    .attr("x", -170)
    .attr("font-size", '16px')
    .attr("text-anchor", "middle")
    .text("Price (USD)")


// Scales
var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

// x-axis
var xAxisCall = d3.axisBottom()
    .ticks(4)
var xAxis = g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")");

// y-axis
var yAxisCall = d3.axisLeft()
var yAxis = g.append("g")
    .attr("class", "y axis")

// event listener
$("#coin-select").on("change", update)
$("#var-select").on("change", update)

// add jquery ui slider
$("#date-slider").slider({
    range: true,
    max: parseTime("31/10/2017").getTime(),
    min: parseTime("12/5/2013").getTime(),
    step: 86400000,
    values: [parseTime("12/5/2013").getTime(), parseTime("31/10/2017").getTime()],
    slide: function(event, ui) {
        $("#dateLabel1").text(formatTime(new Date(ui.values[0])))
        $("#dateLabel2").text(formatTime(new Date(ui.values[1])))
        update()
    }
})

d3.json("data/coins.json").then(function(data) {
    // Data cleaning
    filteredData = {}
    for (var coin in data) {
        if (!data.hasOwnProperty(coin)) { continue }
        filteredData[coin] = data[coin].filter(d => {
            return !(d["price_usd"] == null)
        })
        filteredData[coin].forEach(d => {
            d["price_usd"] = +d["price_usd"]
            d["24h_vol"] = +d["24h_vol"]
            d["market_cap"] = +d["market_cap"]
            d["date"] = parseTime(d["date"])
        })
    }

    update()
});

function update() {
    var coin = $("#coin-select").val(),
        yValue = $("#var-select").val(),
        sliderValues = $("#date-slider").slider("values")
    
    var dataTimeFiltered = filteredData[coin].filter(d => {
        return ((d.date >= sliderValues[0]) && (d.date <= sliderValues[1]))
    })

    // update scales
    x.domain(d3.extent(dataTimeFiltered, (d) => { return d.date; }));
    y.domain([d3.min(dataTimeFiltered, (d) => { return d[yValue]; }) / 1.005, 
    d3.max(dataTimeFiltered, (d) => { return d[yValue]; }) * 1.005]);

    // fix for format values
    var formatSi = d3.format(".2s");
    function formatAbbreviation(x) {
        var s = formatSi(x);
        switch (s[s.length - 1]) {
            case "G": return s.slice(0, -1) + "B";
            case "k": return s.slice(0, -1) + "K";
        }
        return s;
    }

     // Update axes
    xAxisCall.scale(x);
    xAxis.transition(t()).call(xAxisCall);
    yAxisCall.scale(y);
    yAxis.transition(t()).call(yAxisCall.tickFormat(formatAbbreviation));

    // Clear old tooltips
    d3.select(".focus").remove();
    d3.select(".overlay").remove();

    // tooltip code
    var focus = g.append("g")
        .attr("class", "focus")
        .style("display", "none");
    focus.append("line")
        .attr("class", "x-hover-line hover-line")
        .attr("y1", 0)
        .attr("y2", height);
    focus.append("line")
        .attr("class", "y-hover-line hover-line")
        .attr("x1", 0)
        .attr("x2", width);
    focus.append("circle")
        .attr("r", 5);
    focus.append("text")
        .attr("x", 15)
        .attr("dy", ".31em");
    svg.append("rect")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); })
        .on("mousemove", mousemove);

    function mousemove() {
        var x0 = x.invert(d3.mouse(this)[0]),
            i = bisectDate(dataTimeFiltered, x0, 1),
            d0 = dataTimeFiltered[i - 1],
            d1 = dataTimeFiltered[i],
            d = x0 - d0.year > d1.year - x0 ? d1 : d0;
        focus.attr("transform", "translate(" + x(d.date) + "," + y(d[yValue]) + ")");
        focus.select("text").text(() => { return d3.format("$,")(d[yValue].toFixed(2))});
        focus.select(".x-hover-line").attr("y2", height - y(d[yValue]));
        focus.select(".y-hover-line").attr("x2", -x(d.dat));
    }

    // path generator
    line = d3.line()
        .x(d => { return x(d.date) })
        .y(d => { return y(d[yValue]) })
    
    // update line path
    g.select(".line")
        .transition(t)
        .attr("d", line(dataTimeFiltered))

    var newText = (yValue == "price_usd") ? "Price (USD)" :
        ((yValue == "market_cap") ? "Market Capitalization (USD)" : "24 Hour Trading Volume (USD)")
    yLabel.text(newText)
        
}


