const mapWidth = 900 //document.getElementById('map-canvas').offsetWidth
const mapHeight = 600 //document.getElementById('map-canvas').offsetHeight
const svgBar = d3.select('#map-canvas')
    .append('svg')
    .attr('width', '80%')
    .attr('height', '100%')
    .attr('id', 'map-svg')

const projection = d3.geoEquirectangular()
    .center([80, -50])
    .translate([mapWidth / 2, mapHeight / 2]) // translate to center of screen
    .scale([300]) // Temp scale

const path = d3.geoPath().projection(projection)

d3.queue()
    .defer(d3.csv, 'data/mc1-reports-data.csv',
        // Format time
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
        })
    .defer(d3.json, 'data/map.json')
    .await(ready)

function ready(error, data, regions) {
    if (error) throw error

    const categories = d3.keys(data[0]).slice(1, -1)
    const minTime = d3.min(data, d => d.time)
    const maxTime = d3.max(data, d => d.time)
    const originalData = data

    window.update = function () {
        svgBar.selectAll('*').remove()
        d3.selectAll('.tooltip').remove()
        const category = document.getElementById('select-category').value.toLowerCase().replace(/ /g, '_')
        data = originalData
        const lowerElementStyle = getComputedStyle(document.querySelector('.handle--w'))
        const upperElementStyle = getComputedStyle(document.querySelector('.handle--e'))
        const offset = parseInt(lowerElementStyle.width) ? parseInt(lowerElementStyle.width) / 2 : 0

        const lowerTimeRatio = (parseInt(lowerElementStyle.x) + offset) / widthHistogram
        const upperTimeRatio = (parseInt(upperElementStyle.x) + offset) / widthHistogram

        const lowerTimeMinutes = lowerTimeRatio * d3.timeMinute.count(minTime, maxTime)
        const upperTimeMinutes = upperTimeRatio * d3.timeMinute.count(minTime, maxTime)

        const lowerTime = d3.timeMinute.offset(minTime, lowerTimeMinutes)
        const upperTime = parseInt(upperElementStyle.x) !== 0 ? d3.timeMinute.offset(minTime, upperTimeMinutes) : maxTime

        data = data.filter(d => d.time > lowerTime && d.time < upperTime)

        const enterData = svgBar.selectAll('g')
            .data(regions.features)
            .enter()

        enterData.append('path')
            .attr('d', path)
            .attr('class', d => 'region region' + d.id)
            .style('fill', d => {
                const filteredData = data.filter(i => i.location === d.id)
                return colorScale(filteredData.length > 0 ? d3.mean(filteredData, i => i[category]) : 0)
            })

        drawConfidence(data, regions, category)
        drawBarChart(data, regions, category)
        drawCharts(data, selectedRegion, category, regions)

        // Add text and position them over the area
        enterData.append('g').append('text')
            .attr('dx', d => {
                const coordinates = d.geometry.coordinates[0]
                const xCoord = []

                coordinates.forEach(coord => {
                    if (coord.length === 2) {
                        xCoord.push(coord[0])

                    }
                    else {
                        coord.forEach(edgeCase => {
                            xCoord.push(edgeCase[0])
                        })
                    }
                })

                return d3.mean(xCoord) * 5
            })
            .attr('dy', d => {
                const coordinates = d.geometry.coordinates[0]
                const yCoord = []

                coordinates.forEach(coord => {
                    if (coord.length === 2) {
                        yCoord.push(coord[1])

                    }
                    else {
                        coord.forEach(edgeCase => {
                            yCoord.push(edgeCase[1])
                        })
                    }
                })

                return -(d3.mean(yCoord) - 10) * 5
            })
            .text(d => d.id.replace(/^0+/, '') + ' ' + d.properties.name)
            .attr('class', 'region-name')
            .style('pointer-events', 'none')

        //Earthquake area svg overlay
        const checkbox1 = d3.select('#checkbox1')
        const checkbox2 = d3.select('#checkbox2')
        function updateShakemap() {
            const showEllipse1 = checkbox1.property('checked')
            const showEllipse2 = checkbox2.property('checked')
            // Toggle visibility
            svgBar.select('#ellipse1').style('display', showEllipse1 ? 'block' : 'none')
            svgBar.select('#ellipse2').style('display', showEllipse2 ? 'block' : 'none')
        }
        checkbox1.on('change', updateShakemap)
        checkbox2.on('change', updateShakemap)
        const cx1 = 400, cy1 = 50
        const cx2 = 425, cy2 = 25
        const angle = 40

        svgBar.append('ellipse')
            .attr('id', 'ellipse1')
            .attr('cx', cx1)
            .attr('cy', cy1)
            .attr('rx', 200)
            .attr('ry', 60)
            .attr('transform', `rotate(${angle}, ${cx1}, ${cy1})`)
            .style('fill', 'url(#ellipse-gradient)')
            .style('pointer-events', 'none')
        svgBar.append('ellipse')
            .attr('id', 'ellipse2')
            .attr('cx', cx2)
            .attr('cy', cy2)
            .attr('rx', 550)
            .attr('ry', 280)
            .attr('transform', `rotate(${angle}, ${cx1}, ${cy1})`)
            .style('fill', 'url(#ellipse-gradient2)')
            .style('pointer-events', 'none')

        // Radial gradient
        const gradient = svgBar.append('defs')
            .append('radialGradient')
            .attr('id', 'ellipse-gradient')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', '50%')
            .attr('fx', '50%')
            .attr('fy', '50%')
        gradient.append('stop')
            .attr('offset', '10%')
            .style('stop-color', 'steelblue')
            .style('stop-opacity', 1)
        gradient.append('stop')
            .attr('offset', '100%')
            .style('stop-color', 'gray')
            .style('stop-opacity', 0.1)
        const gradient2 = svgBar.append('defs')
            .append('radialGradient')
            .attr('id', 'ellipse-gradient2')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', '50%')
            .attr('fx', '50%')
            .attr('fy', '50%')
        gradient2.append('stop')
            .attr('offset', '0%')
            .style('stop-color', 'yellow')
            .style('stop-opacity', 1)
        gradient2.append('stop')
            .attr('offset', '20%')
            .style('stop-color', '#87fe0f')
            .style('stop-opacity', 0.6)
        gradient2.append('stop')
            .attr('offset', '40%')
            .style('stop-color', '#0ffefe')
            .style('stop-opacity', 0.1)


        updateShakemap()

        // Color code from https://gist.github.com/HarryStevens/6eb89487fc99ad016723b901cbd57fde
        const colorData = [{ 'color': colorScale(-1), 'value': 0 }, { 'color': colorScale(0), 'value': 5 }, { 'color': colorScale(1), 'value': 10 }, { 'color': colorScale(2), 'value': 15 }, { 'color': colorScale(3), 'value': 20 }, { 'color': colorScale(4), 'value': 25 }, { 'color': colorScale(5), 'value': 30 }, { 'color': colorScale(6), 'value': 35 }, { 'color': colorScale(7), 'value': 40 }]
        const extent = d3.extent(colorData, d => d.value)
        const defs = svgBar.append('defs')
        const linearGradient = defs.append('linearGradient').attr('id', 'myGradient')
        linearGradient.selectAll('stop')
            .data(colorData)
            .enter().append('stop')
            .attr('offset', d => ((d.value - extent[0]) / (extent[1] - extent[0]) * 100) + '%')
            .attr('stop-color', d => d.color)

        // Colour scale explanation
        svgBar.append('rect')
            .attr('x', 20)
            .attr('y', 400)
            .attr('height', 40)
            .attr('width', 180)
            .attr('id', 'scale')
            .style('fill', 'url(#myGradient')
        svgBar.append('g')
            .append('text')
            .attr('dx', 20)
            .attr('dy', 400 - 5)
            .text('Low')
        svgBar.append('g')
            .append('text')
            .attr('dx', 200)
            .attr('dy', 400 - 5)
            .style('text-anchor', 'end')
            .text('High')

        // Create a tooltip from https://d3-graph-gallery.com/graph/interactivity_tooltip.html
        const tooltip = d3.select('#map-canvas')
            .append('div')
            .style('opacity', 0)
            .attr('class', 'tooltip')
            .style('width', 100)
            .style('background-color', 'white')
            .style('border', 'solid')
            .style('border-width', '2px')
            .style('border-radius', '5px')
            .style('padding', '5px')

        const mouseover = (d) => {
            d3.selectAll('.region' + d.id)
                .style('fill', 'lightblue')

            tooltip.style('opacity', 1)
                .style('z-index', 10)
        }

        const mousemove = (d) => {
            const filteredData = data.filter(i => i.location === d.id)
            const mean = filteredData.length > 0 ? d3.mean(filteredData, i => i[category]) : 0
            const numReports = filteredData.filter(g => g[category]).filter(g => g != '').length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

            tooltip.html(d.id + ' ' + d.properties.name + '<br />' + document.getElementById('select-category').value + ': ' + mean.toFixed(2) + '<br />Number of reports:<br />' + numReports)
                .style('left', (d3.event.pageX) + 'px')
                .style('top', (d3.event.pageY - 20) + 'px')
        }

        const mouseleave = (d) => {
            tooltip.style('opacity', 0)
                .style('z-index', -1)
        }

        const mouseout = (d) => {
            d3.selectAll('.region' + d.id)
                .style('fill', d => {
                    if (d.value) {
                        const filteredData = data.filter(i => i.location === d.value.id)
                        return colorScale(filteredData.length > 0 ? d3.mean(filteredData, i => i[category]) : 0)
                    }

                    const filteredData = data.filter(i => i.location === d.id)
                    return colorScale(filteredData.length > 0 ? d3.mean(filteredData, i => i[category]) : 0)
                })
        }

        d3.selectAll('.region')
            .on('click', d => {
                selectedRegion = d.id
                drawCharts(data, d.id.replace(/^0+/, ''), category, regions)
            })
            .on('mouseover', mouseover)
            .on('mouseout', mouseout)
            .on('mousemove', mousemove)
            .on('mouseleave', mouseleave)

        d3.select('#all-reports')
            .on('change', () => {
                drawCharts(data, selectedRegion, category, regions)
            })

        d3.select('#moving-average')
            .on('change', () => {
                drawCharts(data, selectedRegion, category, regions)
            })

        d3.select('#confidence-interval')
            .on('change', () => {
                drawCharts(data, selectedRegion, category, regions)
            })
    }

    // Create a select element
    const select = d3.select('#select-attribute')
        .append('select')
        .attr('id', 'select-category')
        .on('change', update)

    // Add the options:
    select.selectAll(null)
        .data(categories)
        .enter()
        .append('option')
        .text(d => {
            return d.charAt(0).toUpperCase() + d.slice(1).replace(/_/g, ' ')
        })

    update()
}