document.addEventListener('DOMContentLoaded', function() {
    // Get form and result section elements
    const predictionForm = document.getElementById('predictionForm');
    const resultsSection = document.getElementById('results-section');
    const errorMessage = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');
    const submitText = document.getElementById('submit-text');
    const newPredictionBtn = document.getElementById('new-prediction-btn');
    
    // Chart initialization variables
    let predictionChart;

    // Handle form submission
    predictionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Show loading spinner
        loadingSpinner.style.display = 'inline-block';
        submitText.textContent = 'Loading...';
        errorMessage.classList.add('d-none');
        
        // Get the city input value
        const city = document.getElementById('cityInput').value.trim();
        
        // Make API request to backend
        fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ city: city })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to get prediction');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide loading state
            loadingSpinner.style.display = 'none';
            submitText.textContent = 'Predict Solar Output';
            
            // Display results
            displayResults(data);
        })
        .catch(error => {
            // Handle errors
            loadingSpinner.style.display = 'none';
            submitText.textContent = 'Predict Solar Output';
            
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('d-none');
            resultsSection.style.display = 'none';
        });
    });
    
    // New prediction button action
    newPredictionBtn.addEventListener('click', function() {
        resultsSection.style.display = 'none';
        predictionForm.reset();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Function to display prediction results
    function displayResults(data) {
        // Display location information
        document.getElementById('location-header').textContent = `${data.weather.city} (${data.weather.latitude.toFixed(2)}°N, ${data.weather.longitude.toFixed(2)}°E)`;
        
        // Display weather information
        document.getElementById('current-time').textContent = data.weather.timestamp;
        document.getElementById('weather-description').textContent = data.weather.weather_description;
        document.getElementById('temperature').textContent = `${data.weather.temperature_2_m_above_gnd.toFixed(1)}°C`;
        document.getElementById('cloud-cover').textContent = `${data.weather.total_cloud_cover_sfc}% Cloud Cover`;
        document.getElementById('wind-speed').textContent = `${data.weather.wind_speed_10_m_above_gnd} m/s Wind Speed`;
        
        // Display power output
        document.getElementById('power-output').textContent = `${data.prediction} kW`;
        
        // Display tips
        const tipsContainer = document.getElementById('tips-container');
        tipsContainer.innerHTML = '';
        
        data.tips.forEach(tip => {
            // Create tip card
            const tipCol = document.createElement('div');
            tipCol.className = 'col-md-6';
            
            const tipCard = document.createElement('div');
            tipCard.className = 'card tip-card p-3 mb-3';
            
            tipCard.textContent = tip;
            tipCol.appendChild(tipCard);
            tipsContainer.appendChild(tipCol);
        });
        
        // Initialize or update chart
        initChart(data);
        
        // Show results section
        resultsSection.style.display = 'block';
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    function initChart(data) {
        const ctx = document.getElementById('predictionChart').getContext('2d');
        
        // Destroy previous chart if it exists
        if (predictionChart) {
            predictionChart.destroy();
        }
        
        // Create mock hourly data based on current prediction
        const currentHour = new Date(data.weather.timestamp).getHours();
        const labels = [];
        const predictions = [];
        
        for (let i = 0; i < 24; i++) {
            labels.push(`${i}:00`);
            
            // Generate a reasonable daily curve
            let factor = 0;
            if (i >= 6 && i <= 18) {
                // Daylight hours - make a bell curve
                factor = 1 - Math.pow((i - 12) / 6, 2);
                factor = Math.max(0, factor);
            }
            
            // Apply cloud cover impact
            const cloudImpact = 1 - (data.weather.total_cloud_cover_sfc / 100) * 0.7;
            
            // Calculate prediction based on time of day and cloud impact
            const hourPrediction = data.prediction * factor * cloudImpact;
            predictions.push(hourPrediction.toFixed(2));
        }
        
        // Create the chart
        predictionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Estimated Power Output (kW)',
                    data: predictions,
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                    pointBorderColor: '#fff',
                    pointRadius: function(context) {
                        const index = context.dataIndex;
                        return index === currentHour ? 6 : 3;
                    },
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return `Hour: ${tooltipItems[0].label}`;
                            },
                            label: function(context) {
                                return `Power: ${context.raw} kW`;
                            }
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Hour of Day'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Power (kW)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }
}); 