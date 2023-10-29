'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllWorkIcon = document.querySelector('.delete__all');
const modalDelete = document.querySelector('.modal');
const btnConfirm = document.querySelector('.btn_confirm');
const btnCancel = document.querySelector('.btn_cancel');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  click = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; //em km
    this.duration = duration; // em min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  clicks() {
    this.click++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);

    this.cadence = cadence;
    //this.type = "running";
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);

    this.elevation = elevation;
    //this.type = "cycling";
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/hm
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #markers;
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  #formTemplate;

  constructor() {
    // Carregar a posição do usuário
    this._getPosition();

    // Dados do local storage
    this._getLocalStorage();

    // EventListeners
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._movToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));

    document.addEventListener('DOMContentLoaded', () => {
      const deleteWorkIcons = document.querySelectorAll('.workout__delete');
      const editIcons = document.querySelectorAll('.workout__edit');

      editIcons.forEach(editIcon =>
        editIcon.addEventListener('click', this._editWorkout.bind(this))
      );

      deleteWorkIcons.forEach(deleteIcon =>
        deleteIcon.addEventListener('click', this._deleteWorkout.bind(this))
      );

      deleteAllWorkIcon.addEventListener(
        'click',
        this._deleteAllWorkouts.bind(this)
      );
    });

    this.#markers = {};
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your position');
      }
    );
  }

  _loadMap(position) {
    //console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    /*console.log(
      `https://www.google.com.br/maps/@${latitude},${longitude},15z?entry=ttu`
    );*/

    const coords = [latitude, longitude];
    //console.log(coords);

    //console.log(this);
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Adicionando evento de listerner no mapa

    this.#map.on('click', this._showForm.bind(this));

    // Renderizando os markers ao atualizar a página

    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  // Mostrar o form após clicar no mapa

  _showForm(mapE) {
    this.#mapEvent = mapE;
    //console.log(this.#mapEvent);

    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // Esconder o form após o submit

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Criar novo workout

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Receber os dados dos inputs

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //console.log(this.#mapEvent);
    //console.log(type);

    // Se a atividade for running, criar objeto running

    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Checar se a data é válida
      if (
        //!Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
      console.log(workout);
      console.log(this.#workouts);
    }

    // Se a atividade for cycling, criar objeto cycling

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
      console.log(workout);
      console.log(this.#workouts);
    }

    // Adicionar novo objeto na array workout

    this.#workouts.push(workout);

    // Renderizar workout no mapa como um marker

    this._renderWorkoutMarker(workout);

    // Renderizar workout em uma lista

    this._renderWorkout(workout);

    // Esconder o form

    this._hideForm();

    // Usando local storage para todos workouts

    this._setLocalStorage();
  }

  // Renderizará o marker no map

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    this.#markers[workout.id] = marker;
  }

  // Renderizará workout em uma lista

  _renderWorkout(workout) {
    console.log(workout);
    let html;
    if (workout) {
      html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <div class="workout__specify">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="edit_delete">
            <span class="workout__edit workout__icon">✏️</span>
            <span class="workout__delete workout__icon">🗑️</span>
          </div>
        </div>
        <div class="workout__details">
          <span class="workout__icon"> ${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value distance">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value duration">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
  `;

      if (workout.type === 'running') {
        html += `
            <div class="workout__details running">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value pace">${Math.floor(
                workout.pace
              )}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details running">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value cadence">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
            <div class="workout__details cycling display ">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value speed">${Math.floor(
                workout.speed
              )}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details cycling display">
              <span class="workout__icon">⛰</span>
              <span class="workout__value elevation">${workout.elevation}</span>
              <span class="workout__unit">m</span>
            </div>  
        </li>
        `;
      }

      if (workout.type === 'cycling') {
        html += `
          <div class="workout__details running display ">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value pace">${Math.floor(workout.pace)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details running display">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value cadence">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          <div class="workout__details cycling ">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value speed">${Math.floor(
              workout.speed
            )}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details cycling">
            <span class="workout__icon">⛰</span>
            <span class="workout__value elevation">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        <li>
        `;
      }
    } else if (!workout) {
      return;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  // Ao clicar em um workout na lista, irá mover para o marker relativo ao workout clicado.
  _movToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    //console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    //console.log(workout);

    if (workout && workout.coords) {
      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }

    //Usando a interface pública
    //workout.clicks();
  }

  // Define o local storage
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Armazena o local storage salvo e renderiza na tela
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    //console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  // Resetará todo o local storage
  reset() {
    localStorage.removeItem('workouts');
    //location.reload();
  }

  // Editar um workout

  _editForm(e) {
    e.preventDefault();

    // Variaveis
    const formEdit = document.querySelector('.edit__form');

    const typeEdit = document.querySelector('.form__input--type_edit');
    const iconEdit = document.querySelector('.workout__details .workout__icon');
    const distanceEdit = document.querySelector('.form__input--distance_edit');
    const durationEdit = document.querySelector('.form__input--duration_edit');
    const elevEdit = document.querySelector('.form__input--elevation_edit');
    const cadEdit = document.querySelector('.form__input--cadence_edit');

    console.log(iconEdit);
    const type = typeEdit.value;
    const distance = +distanceEdit.value;
    const duration = +durationEdit.value;

    const listaTarget = e.target.previousElementSibling;
    let title = listaTarget.querySelector('.workout__title');
    let distanceLabel = listaTarget.querySelector('.workout__value.distance');
    let durationLabel = listaTarget.querySelector('.workout__value.duration');
    let running = listaTarget.querySelectorAll('.workout__details.running');
    let cycling = listaTarget.querySelectorAll('.workout__details.cycling');

    const paceLabel = listaTarget.querySelector('.workout__value.pace');
    const speedLabel = listaTarget.querySelector('.workout__value.speed');
    const cadLabel = listaTarget.querySelector('.workout__value.cadence');
    const elevLabel = listaTarget.querySelector('.workout__value.elevation');

    const data = new Date();
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const workout = this.#workouts
      .map(work => work)
      .find(work => work.id === listaTarget.dataset.id);

    title.textContent = workout.description = `${
      type[0].toUpperCase() + type.toLowerCase().slice(1)
    } on ${months[data.getMonth()]} ${data.getDate()}`;
    distanceLabel.textContent = workout.distance = distance;
    durationLabel.textContent = workout.duration = duration;
    workout.pace = workout.duration / workout.distance;
    workout.speed = workout.distance / (workout.duration / 60);

    if (type === 'running') {
      workout.type = type;

      cycling.forEach(cyc => (cyc.style.display = 'none'));
      running.forEach(run => (run.style.display = 'flex'));

      const cadence = +cadEdit.value;
      const pace = workout.pace;

      paceLabel.textContent = `${pace.toFixed()}`;
      cadLabel.textContent = workout.cadence = cadence;

      listaTarget.classList.remove(`workout--cycling`);
      listaTarget.classList.add(`workout--running`);
    } else if (type === 'cycling') {
      workout.type = type;

      running.forEach(run => (run.style.display = 'none'));
      cycling.forEach(cyc => (cyc.style.display = 'flex'));

      const elevation = +elevEdit.value;
      const speed = workout.speed;

      speedLabel.textContent = `${speed.toFixed()}`;
      elevLabel.textContent = workout.elevation = elevation;

      listaTarget.classList.toggle(`workout--running`);
      listaTarget.classList.add(`workout--cycling`);
    }

    workout.type === 'running'
      ? (iconEdit.textContent = '🏃‍♂️')
      : (iconEdit.textContent = '🚴‍♀️');

    // prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    formEdit.remove();

    this.#map.remove();
    this._getPosition();

    this._setLocalStorage();
  }

  _editWorkout(e) {
    const editIcon = e.target.closest('.workout__edit');
    if (!editIcon) return;

    const workoutEl = editIcon.closest('.workout');
    if (!workoutEl) return;

    const workoutId = workoutEl.dataset.id;

    if (!workoutEl || !this.#workouts.some(work => work.id === workoutId))
      return;

    const editWorkout = this.#workouts.find(work => work.id === workoutId);
    if (!editWorkout) return;

    this.#formTemplate = `
    <form class="form edit__form hidden">
      <p> Edit workout</p>
      <div>
        <div class="form__row">
          <label class="form__label">Type</label>
          <select class="form__input form__input--type_edit">
            <option value="running">Running</option>
            <option value="cycling">Cycling</option>
          </select>
        </div>
        <div class="form__row">
          <label class="form__label">Distance</label>
          <input class="form__input form__input--distance_edit" placeholder="km" />
        </div>
        <div class="form__row">
          <label class="form__label">Duration</label>
          <input class="form__input form__input--duration_edit" placeholder="min" />
        </div>
        <div class="form__row">
          <label class="form__label">Cadence</label>
          <input class="form__input form__input--cadence_edit" placeholder="step/min" />
        </div>
        <div class="form__row form__row--hidden">
          <label class="form__label">Elev Gain</label>
          <input class="form__input form__input--elevation_edit" placeholder="meters" />
        </div>
        <button class="form__btn">OK</button>
      </div>
    </form>`;

    workoutEl.insertAdjacentHTML('afterend', this.#formTemplate);

    const typeEdit = document.querySelector('.form__input--type_edit');
    const elevEdit = document.querySelector('.form__input--elevation_edit');
    const cadEdit = document.querySelector('.form__input--cadence_edit');

    typeEdit.addEventListener('change', () => {
      elevEdit.closest('.form__row').classList.toggle('form__row--hidden');
      cadEdit.closest('.form__row').classList.toggle('form__row--hidden');
    });

    const formEdit = document.querySelector('.edit__form');
    formEdit.classList.remove('hidden');
    formEdit.addEventListener('submit', this._editForm.bind(this));

    console.log(this.#workouts);
  }

  // Excluir um workout
  _deleteWorkout(e) {
    const deleteIcon = e.target.closest('.workout__delete');
    if (!deleteIcon) return;

    const workoutEl = deleteIcon.closest('.workout');
    if (!workoutEl) return;

    const workoutId = workoutEl.dataset.id;

    if (!workoutEl || !this.#workouts.some(work => work.id === workoutId))
      return;

    // Remover workout do mapa
    const marker = this.#markers[workoutId];
    this.#map.removeLayer(marker);

    // Remover workout da lista
    const workoutIndex = this.#workouts.findIndex(
      work => work.id === workoutId
    );

    this.#workouts.splice(workoutIndex, 1);
    workoutEl.remove();

    // Remova o marcador do objeto de mapeamento
    delete this.#markers[workoutId];

    this._setLocalStorage();
  }

  // Excluir todos os workouts
  _openModal() {
    modalDelete.style.display = 'block';
  }

  _closeModal() {
    modalDelete.style.display = 'none';
  }

  _deleteAllWorkouts(e) {
    modalDelete.style.display == this._openModal()
      ? this._closeModal()
      : this._openModal();

    btnCancel.addEventListener('click', () => this._closeModal());

    btnConfirm.addEventListener('click', e => {
      const workoutsEl = e.target
        .closest('.workouts')
        .querySelectorAll('.workout');

      workoutsEl.forEach(work => {
        // Removendo todos os workouts do map
        const workoutId = work.dataset.id;
        const marker = this.#markers[workoutId];
        this.#map.removeLayer(marker);

        // Removendo todos os workouts do lista
        work.remove();

        // Removendo todos os workouts do objeto this.#workouts
        const workoutIndex = this.#workouts.findIndex(
          workout => workout.id === work.dataset.id
        );
        this.#workouts.splice(workoutIndex, 1);
      });

      /////////
      this._closeModal();

      this._setLocalStorage();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this._closeModal();
    });
  }
}

const app = new App();
