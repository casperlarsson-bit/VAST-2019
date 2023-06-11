// Code from https://d3-graph-gallery.com/graph/histogram_basic.html
// set the dimensions and margins of the graph
const marginHistogram = { top: 10, right: 30, bottom: 30, left: 40 },
    widthHistogram = document.getElementById('time-range').offsetWidth - marginHistogram.left - marginHistogram.right,
    heightHistogram = document.getElementById('time-range').offsetHeight - marginHistogram.top - marginHistogram.bottom

// append the svg object to the body of the page
const svgHistogram = d3.select('#time-range')
    .append('svg')
    .attr('width', widthHistogram + marginHistogram.left + marginHistogram.right)
    .attr('height', heightHistogram + marginHistogram.top + marginHistogram.bottom)
    .append('g')
    .attr('transform',
        'translate(' + marginHistogram.left + ',' + marginHistogram.top + ')')

d3.csv('data/mc1-reports-data.csv',
    function (d) {
        return {
            time: d3.timeParse('%Y-%m-%d %H:%M:%S')(d.time),
            sewer_and_water: d.sewer_and_water,
            power: d.power,
            roads_and_bridges: d.roads_and_bridges,
            medical: d.medical,
            buildings: d.buildings,
            shake_intensity: d.shake_intensity,
            location: d.location
        }
    },

    function (data) {
        const timeRange = d3.extent(data, d => d.time)
        const thresholds = d3.timeHour.every(2).range(...timeRange)

        // Define brushing
        const brush = d3.brushX()
            .extent([[0, 0], [widthHistogram, heightHistogram]])
            .on('brush end', burshed)

        // X axis: scale and draw:
        const x = d3.scaleTime()
            .domain(timeRange)     // d3.max(data, function(d) { return +d.price })
            .range([0, widthHistogram])
        svgHistogram.append('g')
            .attr('transform', 'translate(0,' + heightHistogram + ')')
            .call(d3.axisBottom(x))

        const bins = d3.histogram()
            .domain(timeRange)
            .thresholds(thresholds)
            .value(d => d.time)
            (data)

        // Y axis: scale and draw:
        const y = d3.scaleSqrt()
            .range([heightHistogram, 0])
            .domain([0, d3.max(bins, d => d.length)])   // d3.hist has to be called before the Y axis obviously
        //svgHistogram.append('g')
        //    .call(d3.axisLeft(y))

        // Append the bar rectangles to the svg element
        svgHistogram.selectAll('rect')
            .data(bins)
            .enter()
            .append('rect')
            .attr('x', 1)
            .attr('transform', function (d) { return 'translate(' + x(d.x0) + ',' + y(d.length) + ')' })
            .attr('width', function (d) { return x(d.x1) - x(d.x0) })
            .attr('height', function (d) { return heightHistogram - y(d.length) })
            .style('fill', 'rgb(239, 101, 72)')

        svgHistogram.append('g')
            .attr('class', 'brush')
            .call(brush)
            .attr('id', 'time-brush')

        function burshed() {
            update()
        }
    }
)
