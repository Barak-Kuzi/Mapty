'use strict';

// Main class
class Workout{
    date = new Date();
    id = String(Date.now()).slice(-10);     // The ID is created from the 10 last characters of the current time
    workout;
    constructor(coords, distance, duration) {
        this.coords = coords;       // [latitude, longitude]
        this.distance = distance;   // Kilometres
        this.duration = duration;   // Minutes
    }
    // A description of the workout including the current day
    _workoutDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
            'October', 'November', 'December'];

        this.details = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} 
        ${this.date.getDate()}`
    }
}

class Running extends Workout{
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._workoutDescription();
    }
    // Calculation of the rate of movement (minutes / km)
    calcPace(){
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout{
    type = 'cycling';
    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration);
        this.elevation = elevation;
        this.calcSpeed();
        this._workoutDescription();
    }
    // Calculation of the speed, (km / (minutes / 60 )) => Kilometers per hour
    calcSpeed(){
        this.speed = this.distance / (this.duration / 60);
    }
}
// Application structure variables
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
class App{
    #map;
    #mapZoomIn = 13;
    #mapEvent;
    #workouts = [];
    constructor() {
        // Get user's position
        this._getPosition();

        // Get data from local storage
        this._getDataFromLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
    }
    // Returns the current location where we are and calls the function responsible for loading the map
    _getPosition(){
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
            function (){ alert('Could not get your position'); }
        );
    }
    // Loads the map according to the location sent to it and uses the library Leaflet
    _loadMap(currentPosition){
        if (navigator.geolocation){
            const {latitude} = currentPosition.coords;
            const {longitude} = currentPosition.coords;
            const coords = [latitude, longitude];
            console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

            this.#map = L.map('map').setView(coords, this.#mapZoomIn);
            L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'})
                .addTo(this.#map);

            this.#map.on('click', this._showForm.bind(this));
            this.#workouts.forEach((dataW) => this._displayWorkoutMarker(dataW));
        }
    }
    // When clicking on the map, it opens the workout details window (The method in loadMap .on)
    _showForm(clickedEvent){
        this.#mapEvent = clickedEvent;
        form.classList.remove('hidden');
        inputDistance.focus();
    }
    // When changing a workout type, it is required to reveal the required class and hide the other
    _toggleElevationField(){
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    }
    // Creating a new workout and adding it to the map
    _newWorkout(event){
        event.preventDefault();
        // Checking whether the values are correct (positive numbers)
        const isValidInput = (...input) => input.every((value) => Number.isFinite(value));
        const isPositiveNum = (...input) => input.every((value) => value > 0);
        // Variables common to both types of workouts (get data from form)
        const {lat, lng} = this.#mapEvent.latlng;
        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);
        let workout;

        // If workout running, create a running object
        if (type === 'running'){
            const cadence = Number(inputCadence.value);

            // Check if data is valid
            if (!isValidInput(distance, duration, cadence) || !isPositiveNum(distance, duration, cadence)){
                alert('Inputs have to be positive number');
            }
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // If workout cycling, create a cycling object
        if (type === 'cycling'){
            const elevation = Number(inputElevation.value);
            if (!isValidInput(distance, duration, elevation) || !isPositiveNum(distance, duration, elevation)){
                alert('Inputs have to be positive number');
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // Adding the selected workout to the workouts array in the application
        this.#workouts.push(workout);

        // Adding a marker on the map at the selected location and render workout on list
        this._displayWorkoutMarker(workout);
        this._displayWorkoutDetails(workout);

        // Hide form + clear input fields
        this._hideForm();

        // Set local storage to all workouts
        this._setDataToLocalStorage();
    }
    // Adding a marker on the map at the selected location and editing the properties of the marker
    _displayWorkoutMarker(workout){
        L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
        })).setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍'} ${workout.details}`).openPopup();
    }
    // Displaying the training details according to the data entered by the user
    _displayWorkoutDetails(workout){
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
              <h2 class="workout__title">${workout.details}</h2>
              <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
              </div>
              <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
              </div>`

        if (workout.type === 'running'){
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.pace}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>`
        }

        if (workout.type === 'cycling'){
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevation}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>`
        }
        form.insertAdjacentHTML('afterend', html);
    }

    _hideForm(){
        inputDistance.value = '';
        inputDuration.value = '';
        inputCadence.value = '';
        form.classList.add('hidden');
        form.style.display = 'none';
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _moveToMarker(event){
        if (!this.#map) return;
        const eventElement = event.target.closest('.workout');
        if (!eventElement) return;

        const workout = this.#workouts.find((w) => w.id === eventElement.dataset.id);
        this.#map.setView(workout.coords, this.#mapZoomIn, {animate: true, pan: {duration: 1}});
    }

    _setDataToLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getDataFromLocalStorage(){
        const recoveredData = JSON.parse(localStorage.getItem('workouts'));
        if (!recoveredData) return;
        this.#workouts = recoveredData;
        recoveredData.forEach((dataW) => this._displayWorkoutDetails(dataW));
    }

    deleteLocalStorage(){
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();

