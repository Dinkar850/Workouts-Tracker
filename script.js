'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const workoutsSection = document.querySelector('.workouts');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(distance, duration, coords) {
    this.distance = distance; //in km
    this.duration = duration; //in min
    this.coords = coords;
  }
  _setDescription() {
    this.description = `${this.type.replace(
      this.type[0],
      this.type[0].toUpperCase()
    )} on ${Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
    }).format(this.date)}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, eleGain) {
    super(distance, duration, coords);
    this.eleGain = eleGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  constructor() {
    //getting position
    this._getPosition();

    //getting local storage
    this._getLocalStorage();

    //dom events, setting up page
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    document
      .querySelector('.workouts')
      .addEventListener('click', this._moveToPopup.bind(this));
  }

  _getLocalStorage() {
    const data = localStorage.getItem('workouts');
    //if local storage is empty:
    if (!data) return;

    this.#workouts = JSON.parse(data);
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        alert('Couldnt fetch current location')
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    //after the map has loaded, render the markers from data of localStorage, before that it wont work
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const allPositive = (...inputs) => inputs.every(input => input > 0);
    //getting data
    const workout = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let work;
    if (workout === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Enter valid data');

      work = new Running(distance, duration, [lat, lng], cadence);
    }

    if (workout === 'cycling') {
      const elevation = +inputElevation.value;
      //elevation can be negative in going down the mountain
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Enter valid data');
      work = new Cycling(distance, duration, [lat, lng], elevation);
    }

    //adding work object to workout array
    this.#workouts.push(work);

    //rendering marker
    this._renderWorkoutMarker(work);

    //rendering workout list
    this._renderWorkout(work);

    //hide form
    this._hideForm();

    //setting local storage
    this._setLocalStorage();
  }

  _renderWorkout(work) {
    let workoutIcon1,
      workoutIcon2,
      workoutUnit1,
      workoutValue1,
      workoutUnit2,
      workoutValue2;
    if (work.type === 'running') {
      workoutIcon1 = '🏃‍♂️';
      workoutIcon2 = '🦶🏼';
      workoutUnit1 = 'min/km';
      workoutValue1 = work.pace.toFixed(1);
      workoutUnit2 = 'spm';
      workoutValue2 = work.cadence;
    } else {
      workoutIcon1 = '🚴‍♀️';
      workoutIcon2 = '⛰';
      workoutUnit1 = 'km/h';
      workoutValue1 = work.speed.toFixed(1);
      workoutUnit2 = 'm';
      workoutValue2 = work.eleGain;
    }

    const html = `<li class="workout workout--${work.type}" data-id="${work.id}">
          <h2 class="workout__title">${work.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workoutIcon1}</span>
            <span class="workout__value">${work.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">24</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workoutValue1}</span>
            <span class="workout__unit">${workoutUnit1}</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${workoutIcon2}</span>
            <span class="workout__value">${workoutValue2}</span>
            <span class="workout__unit">${workoutUnit2}</span>
          </div>
        </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutMarker(work) {
    L.marker(work.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minWidth: 200,
          closeOnClick: false,
          autoClose: false,
          className: `${work.type}-popup`,
        })
      )
      .setPopupContent(
        `${work.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${work.description}`
      )
      .openPopup();
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    if (!workout) return;

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    //public interface
    //wont work as when object -> string-> object, loses the prototype chain
    // workout.click();
  }

  _hideForm() {
    inputType.value = 'running';
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';
    inputElevation.closest('.form__row').classList.add('form__row--hidden');
    inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  //first public method to reset local storage, and loading again to show that map has been reset in UI as well
  reset() {
    localStorage.removeItem('workouts');
    location.reload(); //for reloading
  }
}

const app = new App();
