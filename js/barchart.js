let selectedRegion = null

// https://d3-graph-gallery.com/graph/barplot_basic.html
// set the dimensions and margins of the graph
const marginBar = { top: 50, right: 30, bottom: 80, left: 60 },
    widthBar = document.getElementById('bar-chart').offsetWidth - marginBar.left - marginBar.right,
    heightBar = document.getElementById('bar-chart').offsetHeight - marginBar.top - marginBar.bottom

// append the svg object to the body of the page
const svgBarchart = d3.select('#bar-chart')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .append('g')
    .attr('transform',
        'translate(' + marginBar.left + ',' + marginBar.top + ')')

function drawBarChart(data, regions, category) {
    svgBarchart.selectAll('*').remove()

    const sumstats = d3.nest()
        .key(d => d.properties.name)
        .rollup(d => {
            const filteredData = data.filter(i => i.location === d[0].id)
            const numReports = filteredData.filter(g => g[category]).filter(g => g != '').length
            const mean = filteredData.length > 0 ? d3.mean(filteredData, i => i[category]) : 0

            return ({ id: d[0].id, numReports: numReports, mean: mean })
        })
        .entries(regions.features)
        .sort((a, b) => d3.ascending(a.value.mean, b.value.mean))

    const regionNames = sumstats.map(d => d.key)

    // X axis
    const x = d3.scaleBand()
        .range([0, widthBar])
        .domain(regionNames)
        .padding(0.2)
    svgBarchart.append('g')
        .attr('transform', 'translate(0,' + heightBar + ')')
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'translate(-10,0)rotate(-45)')
        .style('text-anchor', 'end')

    // Add Y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(sumstats, d => d.value.numReports)])
        .range([heightBar, 0])
    svgBarchart.append('g')
        .call(d3.axisLeft(y))

    // Bars
    svgBarchart.selectAll('mybar')
        .data(sumstats)
        .enter()
        .append('rect')
        .attr('x', d => x(d.key))
        .attr('y', d => y(d.value.numReports))
        .attr('width', x.bandwidth())
        .attr('height', function (d) { return heightBar - y(d.value.numReports) })
        .attr('class', d => 'bar region' + d.value.id)
        .attr('fill', d => colorScale(d.value.mean))
        .style('opacity', 0.8)

    const tooltip = d3.select('#bar-chart')
        .append('div')
        .style('opacity', 0)
        .attr('class', 'tooltip')
        .attr('id', 'bar-chart-tooltip')
        .style('width', 100)
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '2px')
        .style('border-radius', '5px')
        .style('padding', '5px')

    const mouseover = (d) => {
        d3.selectAll('.region' + d.value.id)
            .style('fill', 'lightblue')

        tooltip.style('opacity', 1)
            .style('z-index', 10)
    }

    function mousemove(d) {
        const numReports = d.value.numReports.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
        const currentHeight = document.getElementById('bar-chart').offsetHeight

        // If the tooltip goes out if screen, 78 is mouse offset and 10 is margin for the canvas
        if ((78 + 10 + document.getElementById('bar-chart-tooltip').offsetWidth + d3.mouse(this)[0]) > document.getElementById('bar-chart').offsetWidth) {
            tooltip.html(d.value.id + ' ' + d.key + '<br />Number of reports:<br />' + numReports)
                .style('left', (d3.mouse(this)[0] - 100) + 'px')
                .style('top', (-currentHeight + 15 + d3.mouse(this)[1] + 45) + 'px')
        }
        else {
            tooltip.html(d.value.id + ' ' + d.key + '<br />Number of reports:<br />' + numReports)
                .style('left', (d3.mouse(this)[0] + 78) + 'px')
                .style('top', (-currentHeight + 15 + d3.mouse(this)[1] + 45) + 'px')
        }
    }

    const mouseleave = (d) => {
        tooltip.style('opacity', 0)
            .style('z-index', -1)
    }

    const mouseout = (d) => {
        d3.selectAll('.region' + d.value.id)
            .style('fill', d => {
                if (d.value) {
                    const filteredData = data.filter(i => i.location === d.value.id)
                    return colorScale(d3.mean(filteredData, i => i[category]))
                }

                const filteredData = data.filter(i => i.location === d.id)
                return colorScale(d3.mean(filteredData, i => i[category]))
            })
    }

    d3.selectAll('.bar')
        .on('click', d => {
            selectedRegion = d.value.id
            drawCharts(data, d.value.id.replace(/^0+/, ''), category, regions)
        })
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .on('mousemove', mousemove)
        .on('mouseleave', mouseleave)
}