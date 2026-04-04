/**
 * FuelChartManager.js - Gestor de visualización de gráficos para análisis de costos
 * Usa Apache ECharts para visualizaciones profesionales
 */

function FuelChartManager(containerId) {
    this.containerId = containerId || 'echarts-root';
    this.chart = null;
    this.comparisonRoutes = [];
    this.currentChartType = 'bar';

    this.init();
}

FuelChartManager.prototype.init = function () {
    var self = this;

    // Inicializar ECharts
    if (document.getElementById(this.containerId)) {
        this.chart = echarts.init(document.getElementById(this.containerId));

        // Responsive
        window.addEventListener('resize', function () {
            if (self.chart) {
                self.chart.resize();
            }
        });

        console.log('📊 FuelChartManager inicializado');
    }
};

/**
 * Genera gráfico basado en rutas calculadas
 */
FuelChartManager.prototype.generateChart = function (routes, chartType, xVar, yVar) {
    var self = this;

    if (!routes || routes.length === 0) {
        this.showEmptyMessage();
        return;
    }

    this.currentChartType = chartType;

    var option = {};

    switch (chartType) {
        case 'bar':
            option = this.createBarOption(routes, xVar, yVar);
            break;
        case 'line':
            option = this.createLineOption(routes, xVar, yVar);
            break;
        case 'pie':
            option = this.createPieOption(routes, xVar, yVar);
            break;
        case 'radar':
            option = this.createRadarOption(routes);
            break;
        default:
            option = this.createBarOption(routes, xVar, yVar);
    }

    if (this.chart) {
        this.chart.setOption(option, true);
    }
};

/**
 * Gráfico de barras comparativas
 */
FuelChartManager.prototype.createBarOption = function (routes, xVar, yVar) {
    var names = routes.map(function (r) { return r.name; });

    var xData = this.extractData(routes, xVar);
    var yData = this.extractData(routes, yVar);

    var xLabels = {
        'distance': 'Distancia (km)',
        'fuel': 'Combustible (L)',
        'cost': 'Costo ($)',
        'time': 'Tiempo (h)'
    };

    var yLabels = {
        'cost': 'Costo Total ($)',
        'fuel': 'Combustible (L)',
        'efficiency': 'Eficiencia (km/L)'
    };

    return {
        backgroundColor: 'transparent',
        title: {
            text: 'Comparativa de Rutas',
            left: 'center',
            textStyle: {
                color: '#ffaa00',
                fontSize: 14,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: '#ffaa00',
            textStyle: { color: '#fff' }
        },
        legend: {
            data: [yLabels[yVar] || yVar],
            bottom: 10,
            textStyle: { color: '#fff' }
        },
        grid: {
            left: '10%',
            right: '5%',
            bottom: '15%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: names,
            axisLabel: {
                color: '#fff',
                rotate: 0,
                fontSize: 10
            },
            axisLine: {
                lineStyle: { color: 'rgba(255, 170, 0, 0.5)' }
            }
        },
        yAxis: {
            type: 'value',
            name: yLabels[yVar] || yVar,
            nameTextStyle: { color: '#ffaa00', fontSize: 11 },
            axisLabel: {
                color: '#fff',
                fontSize: 10,
                formatter: function (value) {
                    if (yVar === 'cost') return '$' + value;
                    if (yVar === 'fuel') return value + 'L';
                    return value;
                }
            },
            axisLine: {
                lineStyle: { color: 'rgba(255, 170, 0, 0.5)' }
            },
            splitLine: {
                lineStyle: { color: 'rgba(255, 170, 0, 0.1)' }
            }
        },
        series: [{
            name: yLabels[yVar] || yVar,
            type: 'bar',
            data: yData,
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#ffaa00' },
                    { offset: 1, color: '#ff6600' }
                ]),
                borderRadius: [4, 4, 0, 0]
            },
            emphasis: {
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#ffcc00' },
                        { offset: 1, color: '#ff8800' }
                    ]),
                    shadowBlur: 10,
                    shadowColor: 'rgba(255, 170, 0, 0.5)'
                }
            },
            label: {
                show: true,
                position: 'top',
                color: '#fff',
                fontSize: 10,
                formatter: function (params) {
                    if (yVar === 'cost') return '$' + params.value.toFixed(2);
                    if (yVar === 'fuel') return params.value.toFixed(1) + 'L';
                    return params.value.toFixed(2);
                }
            }
        }]
    };
};

/**
 * Gráfico de línea de tendencia
 */
FuelChartManager.prototype.createLineOption = function (routes, xVar, yVar) {
    var names = routes.map(function (r) { return r.name; });
    var yData = this.extractData(routes, yVar);

    var yLabels = {
        'cost': 'Costo Total ($)',
        'fuel': 'Combustible (L)',
        'efficiency': 'Eficiencia (km/L)'
    };

    return {
        backgroundColor: 'transparent',
        title: {
            text: 'Tendencia de Costos',
            left: 'center',
            textStyle: {
                color: '#ffaa00',
                fontSize: 14,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: '#ffaa00',
            textStyle: { color: '#fff' }
        },
        grid: {
            left: '10%',
            right: '5%',
            bottom: '15%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: names,
            axisLabel: {
                color: '#fff',
                fontSize: 10
            },
            axisLine: {
                lineStyle: { color: 'rgba(255, 170, 0, 0.5)' }
            }
        },
        yAxis: {
            type: 'value',
            name: yLabels[yVar] || yVar,
            nameTextStyle: { color: '#ffaa00', fontSize: 11 },
            axisLabel: {
                color: '#fff',
                fontSize: 10
            },
            axisLine: {
                lineStyle: { color: 'rgba(255, 170, 0, 0.5)' }
            },
            splitLine: {
                lineStyle: { color: 'rgba(255, 170, 0, 0.1)' }
            }
        },
        series: [{
            data: yData,
            type: 'line',
            smooth: true,
            lineStyle: {
                color: '#ffaa00',
                width: 3
            },
            itemStyle: {
                color: '#ffaa00'
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(255, 170, 0, 0.5)' },
                    { offset: 1, color: 'rgba(255, 170, 0, 0)' }
                ])
            },
            label: {
                show: true,
                color: '#fff',
                fontSize: 10
            }
        }]
    };
};

/**
 * Gráfico de pastel/dona
 */
FuelChartManager.prototype.createPieOption = function (routes, xVar, yVar) {
    var data = routes.map(function (r, i) {
        var colors = ['#ffaa00', '#ff6600', '#00ff88', '#00e5ff', '#a200ff'];
        return {
            value: r[yVar] || 0,
            name: r.name,
            itemStyle: {
                color: colors[i % colors.length]
            }
        };
    });

    return {
        backgroundColor: 'transparent',
        title: {
            text: 'Distribución de Costos',
            left: 'center',
            textStyle: {
                color: '#ffaa00',
                fontSize: 14,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: '#ffaa00',
            textStyle: { color: '#fff' },
            formatter: function (params) {
                var total = data.reduce(function (sum, item) { return sum + item.value; }, 0);
                var percent = ((params.value / total) * 100).toFixed(1);
                return params.name + '<br/>' +
                    '$' + params.value.toFixed(2) +
                    ' (' + percent + '%)';
            }
        },
        legend: {
            bottom: 10,
            textStyle: { color: '#fff' }
        },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '50%'],
            data: data,
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(255, 170, 0, 0.5)'
                }
            },
            label: {
                color: '#fff',
                fontSize: 10
            },
            labelLine: {
                lineStyle: { color: 'rgba(255, 170, 0, 0.5)' }
            }
        }]
    };
};

/**
 * Gráfico radar para eficiencia
 */
FuelChartManager.prototype.createRadarOption = function (routes) {
    var indicator = [
        { name: 'Distancia', max: 0 },
        { name: 'Costo', max: 0 },
        { name: 'Combustible', max: 0 },
        { name: 'Eficiencia', max: 0 },
        { name: 'Tiempo', max: 0 }
    ];

    // Calcular máximos
    routes.forEach(function (r) {
        if (r.distance > indicator[0].max) indicator[0].max = r.distance;
        if (r.totalCost > indicator[1].max) indicator[1].max = r.totalCost;
        if (r.fuelConsumed > indicator[2].max) indicator[2].max = r.fuelConsumed;
        if (r.fuelEfficiency > indicator[3].max) indicator[3].max = r.fuelEfficiency;
        if (r.estimatedTime > indicator[4].max) indicator[4].max = r.estimatedTime;
    });

    // Aumentar máximos en 10%
    indicator.forEach(function (i) { i.max = i.max * 1.1 || 100; });

    var seriesData = routes.map(function (r, i) {
        var colors = ['#ffaa00', '#00ff88', '#00e5ff', '#a200ff', '#ff6600'];
        return {
            value: [
                r.distance,
                r.totalCost,
                r.fuelConsumed,
                r.fuelEfficiency,
                r.estimatedTime
            ],
            name: r.name,
            itemStyle: { color: colors[i % colors.length] },
            areaStyle: {
                color: colors[i % colors.length].replace(')', ', 0.3)').replace('rgb', 'rgba')
            }
        };
    });

    return {
        backgroundColor: 'transparent',
        title: {
            text: 'Radar de Eficiencia',
            left: 'center',
            textStyle: {
                color: '#ffaa00',
                fontSize: 14,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: '#ffaa00',
            textStyle: { color: '#fff' }
        },
        legend: {
            bottom: 10,
            data: routes.map(function (r) { return r.name; }),
            textStyle: { color: '#fff' }
        },
        radar: {
            indicator: indicator,
            shape: 'circle',
            splitNumber: 5,
            axisName: {
                color: '#ffaa00',
                fontSize: 10
            },
            splitLine: {
                lineStyle: { color: 'rgba(255, 170, 0, 0.3)' }
            },
            splitArea: {
                show: false
            },
            axisLine: {
                lineStyle: { color: 'rgba(255, 170, 0, 0.5)' }
            }
        },
        series: [{
            type: 'radar',
            data: seriesData
        }]
    };
};

/**
 * Extrae datos de rutas según variable
 */
FuelChartManager.prototype.extractData = function (routes, variable) {
    return routes.map(function (r) {
        switch (variable) {
            case 'distance': return r.distance;
            case 'fuel': return r.fuelConsumed;
            case 'cost': return r.totalCost;
            case 'time': return r.estimatedTime;
            case 'efficiency': return r.fuelEfficiency;
            default: return r[variable] || 0;
        }
    });
};

/**
 * Muestra mensaje cuando no hay datos
 */
FuelChartManager.prototype.showEmptyMessage = function () {
    if (!this.chart) return;

    var option = {
        backgroundColor: 'transparent',
        graphic: {
            type: 'text',
            left: 'center',
            top: 'center',
            style: {
                text: 'Sin datos para mostrar\nCalcula una ruta primero',
                fontSize: 14,
                fontWeight: 'bold',
                fill: 'rgba(255, 170, 0, 0.5)',
                lineHeight: 24
            }
        }
    };

    this.chart.setOption(option, true);
};

/**
 * Añade ruta a comparación
 */
FuelChartManager.prototype.addRouteComparison = function (routeData) {
    if (!routeData) return false;

    // Verificar si ya existe
    for (var i = 0; i < this.comparisonRoutes.length; i++) {
        if (this.comparisonRoutes[i].id === routeData.id) {
            return false;
        }
    }

    this.comparisonRoutes.push(routeData);
    this.updateComparisonList();
    return true;
};

/**
 * Actualiza lista de rutas comparadas
 */
FuelChartManager.prototype.updateComparisonList = function () {
    var listDiv = document.getElementById('route-comparison-list');
    if (!listDiv) return;

    if (this.comparisonRoutes.length === 0) {
        listDiv.innerHTML = '<div class="empty-state-small">Sin rutas comparadas</div>';
        return;
    }

    var self = this;
    var colors = ['#ffaa00', '#00ff88', '#00e5ff', '#a200ff', '#ff6600'];

    var html = this.comparisonRoutes.map(function (r, i) {
        var color = colors[i % colors.length];
        return `
            <div class="layer-item" style="border-left: 3px solid ${color};">
                <div style="flex: 1;">
                    <div style="color: #fff; font-weight: 600; font-size: 0.65rem;">${r.name}</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.55rem;">
                        ${r.distance.toFixed(2)} km | $${r.totalCost.toFixed(2)}
                    </div>
                </div>
                <button onclick="window.removeRouteComparison(${r.id})" 
                    style="background: transparent; border: none; color: #ff4444; cursor: pointer; font-size: 0.7rem;">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
    }).join('');

    listDiv.innerHTML = html;
};

/**
 * Elimina ruta de comparación
 */
FuelChartManager.prototype.removeRouteComparison = function (routeId) {
    for (var i = 0; i < this.comparisonRoutes.length; i++) {
        if (this.comparisonRoutes[i].id === routeId) {
            this.comparisonRoutes.splice(i, 1);
            break;
        }
    }
    this.updateComparisonList();
};

/**
 * Obtiene rutas de comparación
 */
FuelChartManager.prototype.getComparisonRoutes = function () {
    return this.comparisonRoutes;
};

/**
 * Limpia todas las comparaciones
 */
FuelChartManager.prototype.clearComparisons = function () {
    this.comparisonRoutes = [];
    this.updateComparisonList();
};

/**
 * Destruye el gráfico
 */
FuelChartManager.prototype.dispose = function () {
    if (this.chart) {
        this.chart.dispose();
        this.chart = null;
    }
};

// Hacer global
window.FuelChartManager = FuelChartManager;
