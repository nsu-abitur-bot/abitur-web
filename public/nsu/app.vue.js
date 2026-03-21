VueSelect.VueSelect.props.components.default = () => ({
    OpenIndicator: {
        render: function (createElement) {
            return createElement('span', {class: 'icon icon-arrow-down'});
        },
    },
});
Vue.component("v-select", VueSelect.VueSelect);
Vue.use(vueTouchEvents);

Vue.directive('scroll', {
    inserted: function (el, binding) {
        let f = function (evt) {
            if (binding.value(evt, el)) {
                window.removeEventListener('scroll', f);
            }
        };
        window.addEventListener('scroll', f);
    }
});

let tipStartPosition = 0,
    bottomPanelHeight = 0;

app = new Vue({
    el: '#app',
    data: {
        dataFilterDegree: [],
        dataFilterType: [],
        dataFilterCondition: [],
        dataFilterFaculty: [],
        dataFilterDirection: [],
        dataContent: null,
        filter: {
            degree: null,
            type: null,
            faculty: null,
            direction: null,
            condition: null,
            name: null,
            number: null,
        },
        filterInitial: false, // готов фильтр при загрузке страницы
        loading: false, // идёт загрузка данных
        alert: {
            types: {
                success: 'alert-success',
                error: 'alert-danger',
                warning: 'alert-warning',
                info: 'alert-info',
            },
            type: '',
            message: ''
        },
        showContent: false,
        coloring: null,
        needScrollingToSearch: false,
        isOpenDegrees: false,
        isOpenHeaderActionsMenu: false,
        countPriorities: 0,
        showEntrants: 0,
        showStatusItem: null,
        buttonToTop: {
            visible: false,
            top: 0,
            left: 0
        }
    },
    async mounted() {
        const
            urlArray = window.location.pathname.replace(/^\/+/, '').split('/'),
            parameterList = new URLSearchParams(window.location.search),
            degree = this.$refs['degree_name'].value,
            facultyId = parseInt(parameterList.get('faculty')),
            directionId = parseInt(parameterList.get('direction')),
            conditionId = parseInt(parameterList.get('condition')),
            typeId = parseInt(parameterList.get('type'));

        if (undefined !== urlArray[0] && 'statistic' === urlArray[0]) {
            this.loading = true; // включаем режим загрузки, чтобы больше не запрашивались данные
            this.showContent = true;
        }

        this.getDegrees();
        this.getListContent(
            degree,
            facultyId,
            directionId,
            conditionId,
            typeId
        );

        this.$nextTick(function () {
            this.setButtonToTopPosition();
        });
    },
    created: function () {
        window.addEventListener("resize", this.handleResize);
        // document.addEventListener('DOMContentLoaded', () => {
        //     this.setButtonToTopPosition();
        // });
    },
    beforeDestroy: function () {
        window.removeEventListener("resize", this.handleResize);
    },
    methods: {
        async getDegrees() {
            const
                degree = this.$refs['degree_name'].value,
                url = '/degree/index?degree=' + degree;

            this.clearMessageAlert();
            let json = await axios.get(url);

            if (json.data.length === 0) {
                this.messageAlert('info', 'Уровни образования не найдены.');
                return false;
            }
            this.dataFilterDegree = json.data;
            if (this.dataFilterDegree.length > 0) {
                this.dataFilterDegree.forEach((item) => {
                    if (item.value === degree) {
                        this.filter.degree = item;
                    }
                });
            }
            return true;
        },
        async getTypes() {
            const
                parameterList = new URLSearchParams(window.location.search),
                degree = this.filter.degree.value,
                url = '/type/index?degree=' + degree;

            let typeId = parameterList.get('type'),
                zeroFilterType = null;
            if (!typeId) typeId = "0"; // Список по умолчанию

            this.clearMessageAlert();
            let json = await axios.get(url);

            if (json.data.length === 0) {
                // throw new Error('Список оснований поступления не найден.');
                this.messageAlert('info', 'Типы списков не найдены.');
                return false;
            }

            this.dataFilterType = json.data;
            if (this.dataFilterType.length > 0) {
                this.dataFilterType.forEach((item) => {
                    if (item.value === typeId) {
                        this.filter.type = item;
                    }
                    if (item.value === '0') {
                        zeroFilterType = item;
                    }
                });
            }
            if (!this.filter.type) {
                this.filter.type = zeroFilterType;
            }
            return true;
        },
        async getFaculties() {
            const
                parameterList = new URLSearchParams(window.location.search),
                degree = this.filter.degree.value,
                facultyId = parameterList.get('faculty'),
                url = '/faculty/index?degree=' + degree;

            this.clearMessageAlert();

            let json = await axios.get(url);

            if (json.data.length === 0) {
                // throw new Error('Список факультетов не найден.');
                this.messageAlert('info', 'Список факультетов не найден.');
                return false;
            }
            this.dataFilterFaculty = json.data;
            if (facultyId && this.dataFilterFaculty.length > 0) {
                this.dataFilterFaculty.forEach((item) => {
                    if (item.value === facultyId) {
                        this.filter.faculty = item;
                    }
                });
            }
            return true;
        },
        async getDirections() {
            if (!this.filter.faculty) return;
            const
                parameterList = new URLSearchParams(window.location.search),
                degree = this.filter.degree.value,
                facultyId = this.filter.faculty.value,
                directionId = parameterList.get('direction'),
                url = '/direction/index?degree=' + degree + '&faculty=' + facultyId;

            this.clearMessageAlert();
            this.filter.direction = null;

            let json = await axios.get(url);

            if (json.data.length === 0) {
                // throw new Error('Список направлений не найден. Попробуйте изменить параметры фильтра.');
                this.messageAlert('info', 'Список направлений не найден. Попробуйте изменить параметры фильтра.');
                return false;
            }
            this.dataFilterDirection = json.data;
            if (directionId && this.dataFilterDirection.length > 0) {
                this.dataFilterDirection.forEach((item) => {
                    if (item.value === directionId) {
                        this.filter.direction = item;
                    }
                });
            }
            return true;
        },
        async getConditions() {
            const
                parameterList = new URLSearchParams(window.location.search),
                degree = this.filter.degree.value,
                conditionId = parameterList.get('condition'),
                url = '/condition/index?degree=' + degree;

            this.clearMessageAlert();

            let json = await axios.get(url);

            if (json.data.length === 0) {
                // throw new Error('Список оснований поступления не найден.');
                this.messageAlert('info', 'Список оснований поступления не найден.');
                return false;
            }
            this.dataFilterCondition = json.data;
            if (conditionId && this.dataFilterCondition.length > 0) {
                this.dataFilterCondition.forEach((item) => {
                    if (item.value === conditionId) {
                        this.filter.condition = item;
                    }
                });
            }
            return true;
        },
        applyFilter() {
            if (
                !this.filter.degree ||   // не выбран уровень образования
                !this.filter.faculty ||   // не выбран факультет
                !this.filter.direction || // не выбрано направление
                !this.filter.condition || // не выбрано основание поступления
                this.loading === true     // идёт загрузка данных
            ) {
                return false;
            }
            this.getListContent(
                this.filter.degree ? this.filter.degree.value : null,
                this.filter.faculty ? this.filter.faculty.value : null,
                this.filter.direction ? this.filter.direction.value : null,
                this.filter.condition ? this.filter.condition.value : null,
                this.filter.type ? this.filter.type.value : null
            );
        },
        applySearch() {
            if (!this.filter.name) return false;
            this.coloringSearch();
            setTimeout(() => { this.scrollToSearch(); }, 500); // TODO: плохой подход, нужно переделать на использование ref (https://vuejs.org/guide/essentials/template-refs.html)
        },
        getListContent(degree, facultyId, directionId, conditionId, typeId) {
            if (
                !degree ||   // не выбран уровень образования
                !facultyId ||   // не выбран факультет
                !directionId || // не выбрано направление
                !conditionId || // не выбрано основание поступления
                this.loading === true     // идёт загрузка данных
            ) {
                return false;
            }

            this.showContent = true;
            this.dataContent = null;

            let url = new URL(document.location.protocol + '//' + document.location.host + document.location.pathname);
            url.searchParams.set('faculty', facultyId);
            url.searchParams.set('direction', directionId);
            url.searchParams.set('condition', conditionId);
            url.searchParams.set('type', typeId ? typeId : 0);

            const formData = new FormData();
            formData.append(
                document.getElementsByName('csrf-param')[0].content,
                document.getElementsByName('csrf-token')[0].content
            );

            formData.append('degree', degree);
            formData.append('faculty', facultyId);
            formData.append('direction', directionId);
            formData.append('condition', conditionId);
            formData.append('type', typeId);
            // if (name) {
            //     formData.append('name', name);
            // }
            // if (number) {
            //     formData.append('number', number);
            // }

            this.loading = true;
            this.clearMessageAlert();

            window.history.pushState(null, null, url);
            axios.post('/site/list-content', formData)
                .then(json => {
                    if (json.data.items.length === 0) {
                        this.messageAlert('info', 'Список абитуриентов ещё не сформирован.');
                        return;
                    }
                    this.dataContent = json.data;

                    const c = this.dataContent.items.length;
                    this.dataContent.items.forEach((item, i) => {
                        item.show = (i === c-1);
                    });
                    // this.coloringSearch();
                    // this.scrollToSearch();
                })
                .catch(error => {
                    this.messageAlert('error', 'Ошибка системы, пожалуйста, напишите нам на <a href="mailto:support@nsu.ru">support@nsu.ru</a>, прикрепив скриншот страницы.<br>' + error);
                })
                .finally(() => {
                    this.loading = false;
                    this.setButtonToTopPosition();
                    $('.modal').modal('hide');
                });
        },
        toggleEntrantsList(i) {
            let item = this.dataContent.items[i];
            item.show = !item.show;
            this.$set(this.dataContent.items, i, item);
        },
        toggleStatusItem(entrantId) {
            if (this.showStatusItem === entrantId) {
                this.showStatusItem = null;
            } else {
                this.showStatusItem = entrantId;
            }
        },
        messageAlert(type, message) {
            this.alert.type = type;
            this.alert.message = message;
        },
        clearMessageAlert() {
            this.alert.type = '';
            this.alert.message = '';
        },
        resetForm() {
            this.filter.type = null;
            this.filter.faculty = null;
            this.filter.direction = null;
            this.filter.condition = null;
            this.filter.name = null;
            this.filter.number = null;
            this.dataFilterDirection = [];
            this.dataContent = null;
        },
        handleScroll(e) {
            this.setButtonToTopPosition();
            this.buttonToTop.visible = window.scrollY > 200;
        },
        handleResize(e) {
            this.setButtonToTopPosition();
        },
        setButtonToTopPosition() {
            const el = document.body,
                footer = this.$refs['footer'],
                rectFooter = footer.getBoundingClientRect();

            let buttonTop = el.clientHeight;
            if (rectFooter.top < buttonTop) {
                buttonTop = rectFooter.top;
            }
            this.buttonToTop.top = buttonTop - 72;
        },
        checkNameSearch() {
            if (!this.filter.name) return;
            let regexp = /[^a-zа-яё0-9\- ]+/ui;
            this.filter.name = this.filter.name.replace(regexp, '');
        },
        checkNumberSearch() {
            if (!this.filter.number) return;
            let regexp = /[^0-9\- ]+/ui;
            this.filter.number = this.filter.number.replace(regexp, '');
        },
        defineColoring() {
            axios.get('/site/get-coloring')
                .then(json => {
                    this.coloring = json.data;
                });
        },
        coloringSearch() {
            if (this.dataContent === null || !this.dataContent.items.length) return;
            if (!this.filter.name) return;

            let query = this.filter.name
                .trim()
                .toLowerCase()
                .replaceAll('-','')
                .replaceAll(' ','');

            this.dataContent.items.forEach((item,i) => {
                if (item.table && item.table.length) {
                    item.show = false;
                    item.table.map((entrant, j) => {
                        if (
                            entrant.name
                                .toLowerCase()
                                .replaceAll('-','')
                                .replaceAll(' ','')
                                .lastIndexOf(query) >= 0
                            // || entrant.personalNumber
                            //     .replaceAll('-','')
                            //     .replaceAll(' ','')
                            //     .lastIndexOf(query) >= 0
                            // || entrant.snils
                            //     .replaceAll('-','')
                            //     .replaceAll(' ','')
                            //     .lastIndexOf(query) >= 0
                        ) {
                            entrant.className = 'card-select';
                            item.show = true;
                        } else {
                            entrant.className = '';
                        }
                        return entrant;
                    });
                    this.$set(this.dataContent.items, i, item);
                }
            });
        },
        scrollToSearch () {
            let elements = document.getElementsByClassName('card-select');
            if (elements.length === 0) return;

            const scrollTarget = document.querySelector('.card-select'),
                topOffset = 30, // если не нужен отступ сверху
                elementPosition = scrollTarget.getBoundingClientRect().top,
                offsetPosition = elementPosition - topOffset;

            window.scrollBy({
                top: offsetPosition,
                behavior: 'smooth'
            });
        },
        scrollTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        },
        fieldHeader(name) {
            if (this.dataContent && this.dataContent.info.fields.hasOwnProperty(name) && this.dataContent.info.fields[name]) {
                return this.dataContent.info.fields[name];
            }
            return '';
        },
        onMovingTip(e, item) {
            if (tipStartPosition === 0) {
                tipStartPosition = e.touches[0].clientY;
            }

            // console.log(e.touches[0].clientY, e.target);
        },
        onSwipeTip(direction) {

        },
    },
    watch: {
        // следим за изменением фильтра
        'filter.degree'(val,oldVal) {
            if (val !== oldVal) {
                this.getFaculties();
                this.getTypes();
                this.getConditions();
            }
        },
        'filter.faculty'(val,oldVal) {
            if (val !== oldVal) {
                this.getDirections();
            }
        },
        'filter.type'(val,oldVal) {
            if (val !== oldVal) {
                this.applyFilter();
            }
        },
    },
    filters: {
        dateWithoutTime: function (value) {
            return value ? value.split(" ")[0] : '';
        }
        // checkMark: function (value) {
        //     return (value === "✓") ? '<span class="circle bg-green text color-white">' + value + '</span>' : value;
        // },
        // boldNumber: function (value) {
        //     return value.replace(/(\d+)/, '<b>$1</b>');
        // },
        // boldTerm: function (value) {
        //     return value.replace(/([А-Яа-я]+) \–/, '<b>$1</b> –');
        // },
        // appendIndent: function (value) {
        //     return value + '<br>';
        // }
    },
    updated: function () {
        this.$nextTick(function () {
        });
    },
});
