let svg;
let pieChartSvg;
d3.csv("cleaned_data.csv").then(function(data) {
  const defaultYear = data[0].Year.toString();
  populateYearDropdown(data);
  updateBarChart(data, defaultYear);
  svg = updatePieChart(data, defaultYear);
  updateScatterPlot(data, defaultYear);

  document
    .getElementById("year-select")
    .addEventListener("change", function () {
      const selectedYear = this.value;
      updateBarChart(data, selectedYear);
      updatePieChart(data, selectedYear);
      updateScatterPlot(data, selectedYear);
    });
});

function populateYearDropdown(data) {
  const years = [...new Set(data.map((d) => d.Year.toString()))];

  years.sort();

  const select = document.getElementById("year-select");
  select.innerHTML = "";

  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.text = year;
    select.appendChild(option);
  });
}

function updateBarChart(data, selectedYear, filteredData = null) {
  const dataToUse = filteredData || data.filter((d) => d.Year === selectedYear);

  const statusCategories = ["Enrolled", "Unenrolled"];
  const bipocCategories = ["At least one BIPOC", "All White", "Other"];

  let stackedData = {};
  statusCategories.forEach((status) => {
    bipocCategories.forEach((bipoc) => {
      let key = `${status}-${bipoc}`;
      stackedData[key] = 0;
    });
  });

  dataToUse.forEach((d) => {
    let bipocCategory = bipocCategories.includes(d.BIPOC) ? d.BIPOC : "All White";
    let key = `${d.Enrollment_Status}-${bipocCategory}`;
    stackedData[key] += 1;
  });

  let seriesData = statusCategories.map((status) => {
    return bipocCategories.map((bipoc) => {
      let key = `${status}-${bipoc}`;
      return { key: key, value: stackedData[key], count: stackedData[key] };
    });
  });

  const margin = { top: 20, right: 145, bottom: 40, left: 50 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  d3.select("#bar-chart").select("svg").remove();

  const svg = d3
    .select("#bar-chart")
    .append("svg")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`
    )
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const x = d3
    .scaleBand()
    .range([0, width])
    .domain(statusCategories)
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .range([height, 0])
    .domain([0, d3.max(seriesData, (d) => d3.sum(d, (item) => item.value))]);

  const color = d3
    .scaleOrdinal()
    .domain(bipocCategories)
    .range(["#69b3a2", "#404080", "rgba(0, 0, 0, 0)"]);

  const stack = d3
    .stack()
    .keys(bipocCategories)
    .value((d, key) => {
      return d.find((item) => item.key.includes(key)).value;
    });

  const barGroups = svg
    .append("g")
    .selectAll("g")
    .data(stack(seriesData))
    .enter()
    .append("g")
    .attr("fill", (d) => color(d.key));

  barGroups
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("x", (d, i) => x(statusCategories[i]))
    .attr("y", (d) => y(d[1]))
    .attr("height", (d) => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth());

  barGroups
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("text")
    .attr("class", "bar-text")
    .attr("x", (d, i) => x(statusCategories[i]) + x.bandwidth() / 2)
    .attr("y", (d) => (y(d[0]) + y(d[1])) / 2)
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .text((d) => d.data.value);


const enrolledBIPOCData = seriesData[0].filter(d => d.key === 'Enrolled-At least one BIPOC')[0];
const annotations = [
  {
    note: {
      label: "Usually higher percentage of BIPOC families enrolled than unenrolled",
      title: "",
      wrap: 190,
      align: "middle" 
    },
    color: ["#e8336d"], 
    x: x('Enrolled') + x.bandwidth() / 2,
    y: y(enrolledBIPOCData.value),
    dy: -30,
    dx: 30, 
  }
];

const makeAnnotations = d3.annotation()
  .type(d3.annotationLabel)
  .annotations(annotations);

svg.append("g")
  .attr("class", "annotation-group")
  .call(makeAnnotations)
  .selectAll("text.annotation-note-label, text.annotation-note-title")
  .style("fill", "#e8336d"); 


  const legendLabels = {
    "At least one BIPOC": "BIPOC",
    "All White": "All White",
  };

  const legend = svg
    .selectAll(".legend")
    .data(color.domain())
    .enter()
    .append("g")
    .attr("class", "legend")
    .attr("transform", function (d, i) {
      return "translate(" + (width + 20) + "," + i * 20 + ")";
    });

  legend
    .append("rect")
    .attr("x", 0)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);

  legend
    .append("text")
    .attr("x", 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "start")
    .text(function (d) {
      return legendLabels[d];
    });

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom / 2 + 20)
    .text("Enrollment Status");

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -height / 2)
    .text("Number of Families");

  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  svg.append("g").call(d3.axisLeft(y));
  


  
}

function updatePieChart(data, selectedYear, filteredData = null) {
  const dataToUse = filteredData || data.filter((d) => d.Year === selectedYear);

  const count = { BIPOC: 0, White: 0 };
  dataToUse.forEach((d) => {
    if (d.BIPOC === "At least one BIPOC") count.BIPOC += 1;
    else if (d.BIPOC === "All White") count.White += 1;
  });

  const pieData = Object.entries(count).map(([key, value]) => ({
    label: key,
    value,
  }));

  const margin = { top: 20, right: 145, bottom: 40, left: 50 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom,
    radius = Math.min(width, height) / 2;

  let tooltip = d3
    .select("#pie-chart")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "fixed")
    .style("opacity", 0);

  let show_tooltip = function () {
    tooltip.style("opacity", 1);
  };

  let move_tooltip = function (event, d) {
  let msg = d.data.label;
  if (msg === "BIPOC") msg = "At least one BIPOC";
  let tooltip_val = `${msg}<br>Count: ${d.value}`;

  
  let mouseCoords = d3.pointer(event, document.body);

  
  tooltip
    .style("left", (mouseCoords[0] + 15) + "px") 
    .style("top", (mouseCoords[1] + 15) + "px") 
    .html(tooltip_val)
    .style("opacity", 1);
};


  let hide_tooltip = function () {
    tooltip.style("opacity", 0);
  };

  d3.select("#pie-chart").select("svg").remove();

  svg = d3
    .select("#pie-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr(
      "transform",
      "translate(" +
        (width / 2 + margin.left) +
        "," +
        (height / 2 + margin.top) +
        ")"
    );

  const color = d3
    .scaleOrdinal()
    .domain(["BIPOC", "White"])
    .range(["#8ea604", "#f58231"]);

  const pie = d3.pie().value((d) => d.value);
  const data_ready = pie(pieData);

  const pieSlices = svg
    .selectAll("whatever")
    .data(data_ready)
    .enter()
    .append("path")
    .attr("d", d3.arc().innerRadius(0).outerRadius(radius))
    .attr("fill", (d) => color(d.data.label))
    .attr("stroke", "white")
    .style("stroke-width", "2px")
    .style("opacity", 0.7)
    .attr("class", (d) => "pie-slice pie-slice-" + d.data.label.replace(/\s+/g, "-").toLowerCase())
    .on("mouseover", show_tooltip)
    .on("mousemove", move_tooltip)
    .on("mouseleave", hide_tooltip);

  const legend = svg
    .selectAll(".legend")
    .data(color.domain())
    .enter()
    .append("g")
    .attr("class", "legend")
    .attr("transform", function (d, i) {
      return (
        "translate(" +
        (width / 2 + 20) +
        "," +
        (i * 20 - radius + margin.top) +
        ")"
      );
    });

  legend
    .append("rect")
    .attr("x", 0)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);

  legend
    .append("text")
    .attr("x", 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "start")
    .text(function (d) {
      return d;
    });
  pieChartSvg = svg;
  return pieChartSvg;
}

function updateScatterPlot(data, selectedYear) {
  const filteredData = data.filter((d) => d.Year === selectedYear);

  const margin = { top: 40, right: 30, bottom: 70, left: 90 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  d3.select("#scatterplot").select("svg").remove();

   svg = d3
    .select("#scatterplot")
    .append("svg")

    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${
        height + margin.top + margin.bottom
      }`
    )
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .text("Brush to Select Families");

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom / 2)
    .text("Randomized Row Assignment");

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left / 2)
    .attr("x", -height / 2)
    .text("Randomized Column Assignment");

  const x = d3
    .scaleLinear()
    .domain(d3.extent(filteredData, (d) => +d.rowNum))
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  const y = d3
    .scaleLinear()
    .domain(d3.extent(filteredData, (d) => +d.colNum))
    .range([height, 0]);
  svg.append("g").call(d3.axisLeft(y));

  svg
    .append("g")
    .selectAll("dot")
    .data(filteredData)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(+d.rowNum))
    .attr("cy", (d) => y(+d.colNum))
    .attr("r", 1.5)
    .style("fill", "#69b3a2");

  const dots = svg
    .append("g")
    .selectAll("dot")
    .data(filteredData)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(+d.rowNum))
    .attr("cy", (d) => y(+d.colNum))
    .attr("r", 1.5)
    .style("fill", "#69b3a2");

  const brush = d3
    .brush()
    .extent([
      [0, 0],
      [width, height],
    ])
    .on("brush", updateChartsOnBrush);

  svg.append("g").attr("class", "brush").call(brush);

  function updateChartsOnBrush(event) {
    const selection = event.selection;
    if (!selection) {
      updateBarChart(data, selectedYear);
      updatePieChart(data, selectedYear);
      return;
    }

    const [[x0, y0], [x1, y1]] = selection;

    const brushedData = filteredData.filter(
      (d) =>
        x(+d.rowNum) >= x0 &&
        x(+d.rowNum) <= x1 &&
        y(+d.colNum) >= y0 &&
        y(+d.colNum) <= y1
    );

    updateBarChart(brushedData, selectedYear);
    updatePieChart(brushedData, selectedYear);
  }
}
function highlightPieSlice(labelClass) {
  pieChartSvg.selectAll(".pie-slice").style("opacity", 0.5);
  pieChartSvg.select("." + labelClass).style("opacity", 1);
}

function resetPieHighlight() {
  pieChartSvg.selectAll(".pie-slice").style("opacity", 1);
}

document.querySelectorAll(".highlight-trigger").forEach(function (element) {
  element.addEventListener("mouseover", function () {
    const labelClass = this.getAttribute("data-highlight-class");
    const pieSliceClass = "pie-slice-" + labelClass.replace(/\s+/g, "-").toLowerCase();
    highlightPieSlice(pieSliceClass);
  });

  element.addEventListener("mouseout", function () {
    resetPieHighlight();
  });
});

