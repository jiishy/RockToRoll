/// <reference path='jquery-3.2.1.min.js' />
/// <referencs path='jquery-ui.min.js' />

(function (window) {
    var audio = $('audio').get(0);
    var audioContext = new AudioContext();
    var source = audioContext.createMediaElementSource(audio);
    var delay = audioContext.createDelay();
    var analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.connect(delay);
    delay.delayTime.value = 1;
    //delay.connect(audioContext.destination);
    var delay2 = audioContext.createDelay();
    delay.connect(delay2);
    delay2.delayTime.value = 0.5;
    delay2.connect(audioContext.destination);

    var speed_time = 1500;

    var game_canvas = $('canvas').get(0);
    var game_context = game_canvas.getContext('2d');
    game_canvas.width = document.body.clientWidth;
    game_canvas.height = document.body.clientHeight;
    var handle = new Image();
    handle.src = '/res/img/handle2.png';
    var handle_up = new Image();
    handle_up.src = 'res/img/handle_up.png';
    var arrow_down = new Image();
    arrow_down.src = 'res/img/arrow_down.png';
    var timer_interval = 30;
    var main_timer = undefined;
    var keys = [];
    var long_keys = [];
    var directions = ['left', 'up', 'right', 'down'];
    var dir_params = { 'left': [false, true], 'up': [true, true], 'right': [false, false], 'down': [true, false] };
    var press = new Array(directions.length);
    var key_size = 20;
    var handle_size = game_canvas.height < game_canvas.width ? game_canvas.height : game_canvas.width;
    handle_size /= 3;
    var status = 0;
    var perf_interval = 0.04; //perfect interval
    var good_interval = 0.08;
    var game_finish_wait_time = 3000;
    var game_mode = ''

    var cl;
    var power = 100;
    var progressbar = $("#progressbar");
    var power_canvas = $('canvas').get(1);
    var power_context = power_canvas.getContext('2d');
    power_canvas.width = document.body.clientWidth;
    power_canvas.height = document.body.clientHeight;

    var score_unit = {};
    score_unit.init = function () {
        this.score = 0;
        this.max_combo = 0;
        this.combo = 0;
        this.perfect = 0;
        this.good = 0;
        this.miss = 0;
        this.cur_miss = 0;
        this.all = 0;
        this.tap_times = 0;
    }
    score_unit.init();

    var hit_tags = [
        { x: 0.25, y: 0.25 },
        { x: 0.75, y: 0.25 },
        { x: 0.75, y: 0.75 },
        { x: 0.25, y: 0.75 }
    ];

    game_context.draw_round_rect = function (x, y, w, h, r, stroke_color, fill_color, line_width) {
        this.beginPath();
        this.save();
        this.translate(x, y);
        this.moveTo(r, 0);
        this.lineTo(w - r, 0);
        this.arcTo(w, 0, w, r, r);
        this.lineTo(w, h - r);
        this.arcTo(w, h, w - r, h, r);
        this.lineTo(r, h);
        this.arcTo(0, h, 0, h - r, r);
        this.lineTo(0, r);
        this.arcTo(0, 0, r, 0, r);

        this.closePath();
        this.lineWidth = line_width || Math.ceil(w * 0.01);
        if (stroke_color) {
            this.strokeStyle = stroke_color;
            this.stroke();
        }
        if (fill_color) {
            this.fillStyle = fill_color;
            this.fill();
        }
        this.restore();
    }

    game_context.draw_circle = function (x, y, r, stroke_color, fill_color, line_width) {
        this.beginPath();
        this.arc(x, y, r, 0, 2 * Math.PI);
        this.closePath();
        this.lineWidth = line_width || Math.ceil(r * 0.01);
        if (stroke_color) {
            this.strokeStyle = stroke_color;
            this.stroke();
        }
        if (fill_color) {
            this.fillStyle = fill_color;
            this.fill();
        }
    }

    window.change_page = function (page) {
        var cur_page = $('.page--active');
        if (cur_page.prop('id') === page){
            if(cl.goal == 0){
                clearInterval(main_timer);
            }
            return;
        }
        status = 0;
        if (main_timer) {
            clearInterval(main_timer);
        }
        $('audio').get(0).pause();
        switch (page) {
            case 'level_mode':
                break;
            case 'free_mode':
                break;
            case 'about_game':
                break;
            case 'start_page':
                break;
            case 'start_game':
                game_mode = cur_page.prop('id')
                start_game(game_mode);
                break;
            case 'create_music':
                music_graph.draw();
                break;
            case 'file_produce':
                break;
            case 'finish_game':
                on_finish(game_mode);
                break;
            case 'game_mode':
                page = game_mode;
                break;
            default:
                return;
        }
        var next_page = $('#' + page)
        cur_page.addClass('fly_out_to_left').addClass('left');
        next_page.addClass('page--active').addClass('right');
        setTimeout(() => {
            cur_page.removeClass('fly_out_to_left').removeClass('page--active').removeClass('left');
            next_page.removeClass('right');
        }, 1000);
    }

    window.start_game = function (mode) {
        switch (mode) {
            case 'level_mode':
                var level = parseInt($('.current').prop('id').replace('panel_', ''));
                $('audio').attr('src', `res/level/level_${level}.mp3`);
                $.getJSON(`res/level/level_${level}.json`, function (data) {
                    scheduler.load(data[0]);
                    on_start(mode);
                });
                break;
            case 'free_mode':
                var files = $('#file_input_music').get(0).files;
                var reader = new FileReader();
                if (files.length) {
                    var file = files[0];
                    if (/audio+/.test(file.type)) {
                        reader.onload = function () {
                            $('audio').attr('src', this.result);
                            on_start(mode);
                        }
                    }
                    reader.readAsDataURL(file);
                }
                else {
                    $('audio').attr('src', 'res/music/test4.mp3');
                    on_start(mode);
                }
                break;
            case 'create_music':
                on_start(mode);
                break;
            case 'file_produce':
                var files = $('#file_produce_music').get(0).files;
                var reader = new FileReader();
                if (files.length) {
                    var file = files[0];
                    if (/audio+/.test(file.type)) {
                        reader.onload = function () {
                            $('audio').attr('src', this.result);
                            var _files = $('#file_produce_text').get(0).files;
                            var _reader = new FileReader();
                            if (_files.length) {
                                var _file = _files[0];
                                if (/text+/.test(_file.type)) {
                                    _reader.onload = function () {
                                        scheduler.load(this.result);
                                        on_start(mode);
                                    }
                                }
                                _reader.readAsText(_file);
                            }
                        }
                    }
                    reader.readAsDataURL(file);
                }
                break;
            default:
                break;
        }
    }

    window.onresize = function () {
        power_canvas.width = document.body.clientWidth;
        power_canvas.height = document.body.clientHeight;
        game_canvas.width = document.body.clientWidth;
        game_canvas.height = document.body.clientHeight;
        handle_size = game_canvas.height < game_canvas.width ? game_canvas.height : game_canvas.width;
        handle_size /= 3;
        keys.forEach(key => {
            key.r = handle_size / 4;
        });
        var elem = document.getElementById('shine_left');
        elem.style.left = game_canvas.width / 2 - handle_size / 2 - elem.clientWidth / 2 + 'px';
        elem.style.top = game_canvas.height / 2 - elem.clientHeight / 2 + 'px';

        var elem = document.getElementById('shine_up');
        elem.style.left = game_canvas.width / 2 - elem.clientWidth / 2 + 'px';
        elem.style.top = game_canvas.height / 2 - handle_size / 2 - elem.clientHeight / 2 + 'px';

        var elem = document.getElementById('shine_right');
        elem.style.left = game_canvas.width / 2 + handle_size / 2 - elem.clientWidth / 2 + 'px';
        elem.style.top = game_canvas.height / 2 - elem.clientHeight / 2 + 'px';

        var elem = document.getElementById('shine_down');
        elem.style.left = game_canvas.width / 2 - elem.clientWidth / 2 + 'px';
        elem.style.top = game_canvas.height / 2 + handle_size / 2 - elem.clientHeight / 2 + 'px';

        draw_all();
        music_graph.update_size();
    }

    window.onkeydown = function (event) {
        if (!status)
            return;
        var key = event.which || event.keyCode;
        var index = parseInt(key) - 37;
        if (index < 0 || index >= directions.length)
            return;
        if (press[index] == true)
            return;
        press[index] = true;
        check_direction(index);
        event.preventDefault();
    }

    window.onkeyup = function (event) {
        if (!status)
            return;
        var key = event.which || event.keyCode;
        var index = parseInt(key) - 37;
        if (index < 0 || index >= directions.length)
            return;
        press[index] = false;
        event.preventDefault();
    }

    window.check_direction = function (index) {
        var is_vertical;
        var is_top_left;
        var rate;
        var type;
        switch (directions[index]) {
            case 'up':
                is_vertical = true;
                is_top_left = true;
                rate = 0.5 - handle_size / game_canvas.height / 2;
                break;
            case 'right':
                is_vertical = false;
                rate = 0.5 + handle_size / game_canvas.width / 2;
                is_top_left = false;
                break;
            case 'down':
                is_vertical = true;
                is_top_left = false;
                rate = 0.5 + handle_size / game_canvas.height / 2;
                break;
            case 'left':
                is_vertical = false;
                is_top_left = true;
                rate = 0.5 - handle_size / game_canvas.width / 2;
                break;
            default:
                return;
        }
        for (var i = 0; i < keys.length; ++i) {
            if (keys[i].is_miss == 0 && keys[i].is_top_left == is_top_left && keys[i].is_vertical == is_vertical) {
                if (keys[i].pos > rate - perf_interval && keys[i].pos < rate + perf_interval) {
                    type = 'perfect';
                }
                else if (keys[i].pos > rate - good_interval && keys[i].pos < rate + good_interval) {
                    type = 'good';
                }
                else
                    continue;
                keys[i].is_hit = true;
                var temp = keys.splice(i, 1);
                if (temp[0].type == 'long' && temp[0].tail_length > 0) {
                    $('#shine_' + directions[index]).css('display', 'block');
                    temp[0].pos = rate;
                    temp.push(index);
                    long_keys.push(temp);
                }
                add_score(index, type);
                break;
            }
        }
    }

    window.show_hit_tag = function (dir_index, type) {
        document.getElementById("score").innerHTML = "Score :" + score_unit.score;
        var elem = document.getElementById('hit_tag_' + directions[dir_index]);
        var hit_tag_color = { 'perfect': '#FFEE18', 'good': '#59C150', 'miss': '#FF1493' };
        switch (directions[dir_index]) {
            case 'left':
                elem.style.right = (game_canvas.width + handle_size) / 2 + 'px';
                elem.style.bottom = (game_canvas.height + handle_size) / 2 + 'px';
                break;
            case 'up':
                elem.style.left = (game_canvas.width + handle_size) / 2 + 'px';
                elem.style.bottom = (game_canvas.height + handle_size) / 2 + 'px';
                break;
            case 'right':
                elem.style.left = (game_canvas.width + handle_size) / 2 + 'px';
                elem.style.top = (game_canvas.height + handle_size) / 2 + 'px';
                break;
            case 'down':
                elem.style.right = (game_canvas.width + handle_size) / 2 + 'px';
                elem.style.top = (game_canvas.height + handle_size) / 2 + 'px';
                break;
        }
        if (directions[dir_index] == 'right' || directions[dir_index] == 'down')
            elem.style.transitionProperty = 'top, opacity';
        else
            elem.style.transitionProperty = 'bottom, opacity';
        elem.style.transitionDuration = '0s';
        elem.style.transitionDelay = '0s';
        elem.style.opacity = 1;
        if(type == 'miss')
            elem.textContent = type + ' ' + score_unit.miss;
        else
            elem.textContent = type + ' ' + score_unit.combo;
        elem.style.color = hit_tag_color[type];
        setTimeout((item, index) => {
            item.style.transitionDuration = '0.5s';
            if (directions[index] == 'right' || directions[index] == 'down') {
                item.style.transitionProperty = 'top, opacity';
                item.style.top = (parseInt(item.style.top) - game_canvas.height * 0.05) + 'px';
            }
            else {
                item.style.transitionProperty = 'bottom, opacity';
                item.style.bottom = (parseInt(item.style.bottom) + game_canvas.height * 0.05) + 'px';
            }
            item.style.transitionDelay = '0s, 0.5s';
            item.style.opacity = 0;
        }, timer_interval, elem, dir_index);
    }

    window.add_score = function (dir_index, type) {
        if (score_unit.combo > 40)
            score_unit.score += 5;
        else if (score_unit.combo > 20)
            score_unit.score += 3;
        else
            score_unit.score += 1;
        if (type == 'perfect') {
            ++score_unit.perfect;
            ++score_unit.score;
        }
        else if (type == 'good')
            ++score_unit.good;
        ++score_unit.combo;
        ++score_unit.tap_times;
        update_progressBar(score_unit.tap_times);
        if (score_unit.combo > score_unit.max_combo)
            score_unit.max_combo = score_unit.combo;
        score_unit.cur_miss = 0;
        show_hit_tag(dir_index, type);
        add_power("hit");
    }

    window.draw_handle = function () {
        game_context.drawImage(handle, (game_canvas.width - handle_size) / 2,
            (game_canvas.height - handle_size) / 2, handle_size, handle_size);
        for (var i = 0; i < directions.length; ++i) {
            if (press[i]) {
                draw_press(i);
            }
        }
    }

    window.draw_press = function (index) {
        game_context.save();
        game_context.translate(game_canvas.width / 2, game_canvas.height / 2);
        switch (directions[index]) {
            case 'up':
                break;
            case 'right':
                game_context.rotate(Math.PI / 2);
                break;
            case 'down':
                game_context.rotate(Math.PI);
                break;
            case 'left':
                game_context.rotate(-Math.PI / 2);
                break;
            default:
                game_context.restore();
                return;
        }
        game_context.drawImage(handle_up, -handle_size / 2, -handle_size / 2, handle_size, handle_size);
        game_context.restore();
    }

    window.create_key = function (is_vertical, is_top_left, speed_time, type, during_time) {
        var key = {};
        key.r = handle_size / 4;
        key.is_vertical = is_vertical;
        key.is_top_left = is_top_left;
        key.speed_time = speed_time;
        key.pos = is_top_left ? 0 : 1;
        key.smaller_rate = 0.9;
        key.type = type || 'single';
        key.during_time = during_time || 0;
        key.is_hit = false;
        key.is_miss = 0;
        key.ticks = 0;
        key.add_score_ticks = 8;
        key.speed = (() => {
            var rate = handle_size / (is_vertical ? game_canvas.height : game_canvas.width) / 2;
            return (0.5 - rate) * timer_interval / speed_time;
        })();
        key.tail_length = (() => {
            return type == 'long' ? key.speed * during_time / timer_interval : 0;
        })();
        key.update = function () {
            if (!this.is_hit && this.is_miss != 1)
                this.pos += this.is_top_left ? this.speed : -this.speed;
            else
                this.tail_length -= this.speed;
            if (this.is_hit)
                ++this.ticks;
        }
        return key;
    }

    window.draw_key = function (key) {
        game_context.save();
        if (key.is_vertical) {
            var x = game_canvas.width / 2;
            var y = key.pos * game_canvas.height;
            var tail_length = key.tail_length * game_canvas.height;
            if (key.is_top_left) {
                game_context.translate(x, y + key.r / 2);
                game_context.rotate(Math.PI);
            }
            else {
                game_context.translate(x, y - key.r / 2);
            }
        }
        else {
            var y = game_canvas.height / 2;
            var x = key.pos * game_canvas.width;
            var tail_length = key.tail_length * game_canvas.width;
            if (key.is_top_left) {
                game_context.translate(x + key.r / 2, y);
                game_context.rotate(Math.PI / 2);
            }
            else {
                game_context.translate(x - key.r / 2, y);
                game_context.rotate(-Math.PI / 2);
            }
        }
        var rate = handle_size / (key.is_vertical ? game_canvas.height : game_canvas.width) / 3.5;
        if (key.is_top_left ? key.pos > 0.5 - rate : key.pos < 0.5 + rate) {
            key.r *= key.smaller_rate;
            game_context.drawImage(arrow_down, -key.r / 2, -key.r / 2, key.r, key.r);
        }
        else {
            game_context.drawImage(arrow_down, -key.r / 2, -key.r / 2, key.r, key.r);
        }
        if (key.type == 'long') {
            game_context.strokeStyle = key.is_hit ? 'red' : 'white';
            game_context.lineWidth = 4;
            game_context.beginPath();
            game_context.moveTo(0, key.r / 2);
            game_context.lineTo(0, key.r / 2 + tail_length);
            game_context.moveTo(-key.r / 2, key.r / 2 + tail_length);
            game_context.lineTo(key.r / 2, key.r / 2 + tail_length);
            game_context.stroke();
        }
        game_context.restore();
    }

    window.draw_all = function () {
        game_canvas.height = game_canvas.height;
        draw_handle();
        keys.forEach(key => {
            draw_key(key);
        });
        long_keys.forEach(key => {
            draw_key(key[0]);
        });
    }

    window.update_all = function () {
        for (var i = 0; i < keys.length; ++i) {
            keys[i].update();
            var rate = handle_size / (keys[i].is_vertical ? game_canvas.height : game_canvas.width) / 9;
            if (keys[i].is_miss != 1 && keys[i].is_top_left ? keys[i].pos > 0.5 - rate : keys[i].pos < 0.5 + rate) {
                if (keys[i].is_miss == 0) {
                    if(score_unit.tap_times < 100){
                        score_unit.combo = 0;
                        ++score_unit.cur_miss;
                        show_hit_tag((keys[i].is_vertical ? (keys[i].is_top_left ? 1 : 3) : (keys[i].is_top_left ? 0 : 2)), 'miss');
                    }
                    ++score_unit.miss;
                    add_power("miss");
                }
                keys[i].is_miss = 1;
            }
            if (keys[i].is_miss == 1) {
                if (keys[i].type == 'single' || keys[i].tail_length <= 0) {
                    keys.splice(i, 1);
                    --i;
                    continue;
                }
            }
        }
        for (var i = 0; i < long_keys.length; ++i) {
            if (press[long_keys[i][1]] == false) {
                $('#shine_' + directions[long_keys[i][1]]).css('display', 'none');
                long_keys[i][0].is_miss = 2;
                long_keys[i][0].is_hit = false;
                keys.push(long_keys[i][0]);
                long_keys.splice(i, 1);
                --i;
                continue;
            }
            long_keys[i][0].update();
            if (long_keys[i][0].ticks >= long_keys[i][0].add_score_ticks) {
                long_keys[i][0].ticks = 0;
                add_score(long_keys[i][1], 'perfect');
            }
            if (long_keys[i][0].tail_length <= 0) {
                $('#shine_' + directions[long_keys[i][1]]).css('display', 'none');
                long_keys.splice(i, 1);
                --i;
                continue;
            }
        }
    }
    window.add_power = function (type) {
        if(type == 'miss'){
            if(score_unit.cur_miss > 20)
                cl.goal = (cl.goal > 5 ? cl.loaded - 5 : 0);
            else if(score_unit.cur_miss > 10)
                cl.goal = (cl.goal > 3 ? cl.loaded - 1 : 0);
            else
                cl.goal = (cl.goal > 1 ? cl.loaded - 1 : 0);
        }
        else if(type == 'hit'){
            if (score_unit.combo > 40){
                cl.goal = (cl.goal < 95 ? cl.loaded + 5 : 100);
            }
            else if (score_unit.combo > 20){
                cl.goal = (cl.goal < 97 ? cl.loaded + 3 : 100);
            }
            else
                cl.goal = (cl.goal < 99 ? cl.loaded + 1 : 100);
        }
        if(cl.goal == 0){
            change_page('finish_game');
            //on_finish(game_mode);
        }
    }
    window.timer_update = function () {
        update_all();
        draw_all();
    }

    window.on_start = function (mode) {
        init_game();
        main_timer = setInterval(timer_update, timer_interval);
        if (mode == 'free_mode') {
            start_schedule();
        }
        else if (mode == 'create_music') {
            analyse_music(true);
        }
        else if (mode == 'level_mode' || mode == 'file_produce') {
            scheduler.start();
        }
    }

    window.on_finish = function (mode) {
        var max_score;
        if (score_unit.all < 20)
            max_score = score_unit.all * 2;
        else if (score_unit.all < 40)
            max_score = 4 * score_unit.all - 40;
        else
            max_score = 6 * score_unit.all - 120;

        $('#final_score').get(0).innerHTML = score_unit.score;
        $('#rank').get(0).innerHTML = get_rank(score_unit.score);
        console.log(get_rank(score_unit.score));
        $('#perfect').get(0).innerHTML = "perfect : " + score_unit.perfect;
        $('#good').get(0).innerHTML = "good : " + score_unit.good;
        $('#miss').get(0).innerHTML = "miss : " + score_unit.miss;
        $('#max_combo').get(0).innerHTML = "max_combo : " + score_unit.max_combo;
        /*
        $('#finish_game .statement').get(0).innerHTML = `
            score : ${score_unit.score},
            perfect: ${score_unit.perfect},
            good: ${score_unit.good},
            miss: ${score_unit.miss},
            max combo: ${score_unit.max_combo},
            all keys: ${score_unit.all},
            max score: ${max_score}
       `;*/
    }
    window.get_rank = function(score){
        var rank = score / score_unit.all;
        if(rank > 0.95)
            return 'SSS';
        else if(rank > 0.9)
            return 'SS';
        else if(rank > 0.85)
            return 'S';
        else if(rank > 0.8)
            return 'A';
        else if(rank > 0.75)
            return 'B';
        else if(rank > 0.7)
            return 'C';
        else if(rank > 0.65)
            return 'D';
        else if(rank > 0.6)
            return 'E';
        else
            return 'F';
    }
    window.init_game = function () {
        keys = [];
        long_keys = [];
        for (var i = 0; i < directions.length; ++i) {
           document.getElementById('hit_tag_' + directions[i]).style.opacity = 0;
        }
        $('.shine').css('display', 'none');
        for (var i = 0; i < directions.length; ++i)
            press[i] = false;
        score_unit.init();
        status = 1;
        cl = new lightLoader(power_canvas, power_canvas.width, power_canvas.height, 20);
        setupRAF();
        cl.init();
        update_progressBar(0);
        onresize();
    }

    window.update_progressBar = function (percent) {
        var temp = percent / 100;
        $(function () {
            progressbar.progressbar({
                value: percent
            });
            if(percent >= 100){
                var progressbarValue = progressbar.find( ".ui-progressbar-value" );
                progressbarValue.css({
                    "background":"yellow"
                });
            }
        });
    }

    window.start_schedule = function () {
        var length = analyser.frequencyBinCount * 44100 / audioContext.sampleRate || 0;
        var output = new Uint8Array(length);
        var buffer = new Uint8Array(length);
        for (var i = 0; i < output.length; ++i) {
            buffer[i] = 0;
        }
        var n = 4;
        var timer = new Array(n);
        var sum = new Array(n);
        var k_value = new Array(n);
        var step = parseInt(length / n);
        for (var i = 0; i < n; ++i) {
            timer[i] = undefined;
            k_value[i] = 200;
        }
        var timer_key = undefined;
        var can_create = true;
        audio.play();
        (function callee(e) {
            analyser.getByteFrequencyData(output);
            var count = 0;
            for (var i = 0; i < 4; ++i) {
                sum[i] = 0;
                for (var j = step * i; j < step * (i + 1) ; ++j) {
                    sum[i] += Math.abs(output[j] - buffer[j]);
                    buffer[j] = output[j];
                    if (output[j] > 0) {
                        last = j;
                    }
                }
                if (sum[i] > k_value[i]) {
                    ++count;
                    k_value[i] += 1;
                    if (timer[i]) {
                        clearTimeout(timer[i]);
                    }
                    timer[i] = setTimeout(k => {
                        timer[k] = undefined;
                    }, 100, i);
                }
                else {
                    k_value[i] -= 0.1;
                }
            }
            for (var i = output.length - 1; i >= 0; --i) {
                if (output[i] > 0)
                    break;
            }
            step = parseInt(i / n);
            if (count >= 2) {
                if (timer_key) {
                    clearTimeout(timer_key);
                }
                else {
                    if (can_create) {
                        can_create = false;
                        ++score_unit.all;
                        keys.push(create_key(parseInt(Math.random() * 124253) % 2,
                            parseInt(Math.random() * 5798321) % 2, 1500));
                        setTimeout(() => { can_create = true; }, 200);
                    }
                }
                timer_key = setTimeout(k => {
                    timer_key = undefined;
                }, 100, i);
            }
            if (!audio.paused)
                requestAnimationFrame(callee);
            else if (status == 1) {
                setTimeout(() => {
                    change_page('finish_game');
                }, game_finish_wait_time);
            }
        })();
    }

    var time_map = { '1': 4000, '2': 2000, '6': 3000, '4': 1000, '12': 1500, '8': 500, '24': 750, '16': 250, '48': 375, '32': 125 };

    for (key in time_map) {
        time_map[key] *= 0.6;
    }

    var fre_map = {
        '----6': 27.5, '----6#': 29.1352, '----7': 30.8677, '---1': 32.7032, '---1#': 34.6478,
        '---2': 36.7081, '---2#': 38.8909, '---3': 41.2034, '---4': 43.6535, '---4#': 46.2493,
        '---5': 48.9994, '---5#': 51.9131, '---6': 55, '---6#': 58.2705, '---7': 61.7354,
        '--1': 65.4064, '--1#': 69.2957, '--2': 73.4162, '--2#': 77.7817, '--3': 82.4069,
        '--4': 87.3071, '--4#': 92.4986, '--5': 97.9989, '--5#': 103.826, '--6': 110,
        '--6#': 116.541, '--7': 123.471, '-1': 130.813, '-1#': 138.591, '-2': 146.832,
        '-2#': 155.563, '-3': 164.814, '-4': 174.614, '-4#': 184.997, '-5': 195.998,
        '-5#': 207.652, '-6': 220, '-6#': 233.082, '-7': 246.942, '1': 261.626,
        '1#': 277.183, '2': 293.665, '2#': 311.127, '3': 329.628, '4': 349.228,
        '4#': 369.994, '5': 391.995, '5#': 415.305, '6': 440, '6#': 466.164,
        '7': 493.883, '+1': 523.251, '+1#': 554.365, '+2': 587.33, '+2#': 622.254,
        '+3': 659.255, '+4': 698.456, '+4#': 739.989, '+5': 783.991, '+5#': 830.609,
        '+6': 880, '+6#': 982.328, '+7': 987.767, '++1': 1046.5, '++1#': 1108.73,
        '++2': 1174.66, '++2#': 1244.51, '++3': 1318.51, '++4': 1396.91, '++4#': 1479.98,
        '++5': 1567.98, '++5#': 1661.22, '++6': 1760, '++6#': 1864.66, '++7': 1975.53,
        '+++1': 2093, '+++1#': 2217.46, '+++2': 2349.32, '+++2#': 2489.02, '+++3': 2637.02,
        '+++4': 2793.83, '+++4#': 2959.96, '+++5': 3135.96, '+++5#': 3322.44, '+++6': 3520,
        '+++6#': 3729.31, '+++7': 3951.07, '++++1': 4186.01
    };

    var music_editor_mode = 'graph';

    window.analyse_music = function (to_start) {
        if (!to_start && status == 2) {
            status = 0;
        }
        else {
            var node_list = [];
            if (music_editor_mode == 'text') {
                var text = $('#music_editor_text').val();
                if (/^([\-\+]*[1-7]+#?,[0-9]+;\s*)+$/.test(text)) {
                    text = text.replace(/\s*/g, '');
                }
                else {
                    console.log('Wrong music format.');
                    return;
                }
                node_list = text.split(';');
                for (var i = 0; i < node_list.length; ++i) {
                    node_list[i] = node_list[i].split(',');
                }
            }
            else if (music_editor_mode == 'graph') {
                music_graph.node_list.forEach(node => {
                    node_list.push(node.to_data());
                });
            }
            status = to_start ? 1 : 2;
            play_music(node_list, to_start);
        }
    }

    window.play_music = function (node_list, to_start) {
        if ((!to_start && status != 2) || (to_start && status != 1))
            return;
        var node = node_list.shift();
        if (node == undefined) {
            if (status == 1) {
                setTimeout(() => {
                    change_page('finish_game');
                }, game_finish_wait_time);
            }
            return;
        }
        if (time_map[node[1]] == undefined) {
            play_music(node_list, to_start);
            return;
        }
        if (fre_map[node[0]] == undefined) {
            setTimeout(play_music, time_map[node[1]], node_list, to_start);
            return;
        }
        var oscillator = audioContext.createOscillator();
        var gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        if (to_start) {
            gainNode.connect(delay);
        }
        else {
            gainNode.connect(audioContext.destination);
        }
        oscillator.frequency.value = fre_map[node[0]];
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(20, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + time_map[node[1]] / 1000);
        oscillator.type = 'sine';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + time_map[node[1]]);
        if (to_start) {
            if (time_map[node[1]] >= 500) {
                keys.push(create_key(parseInt(Math.random() * 124253) % 2, parseInt(Math.random() * 5798321) % 2, 1500, 'long', time_map[node[1]] / 2));
                score_unit.all += Math.ceil(time_map[node[1]] / 2 / keys[0].add_score_ticks / timer_interval);
            }
            else {
                ++score_unit.all;
                keys.push(create_key(parseInt(Math.random() * 124253) % 2, parseInt(Math.random() * 5798321) % 2, 1500));
            }
        }
        setTimeout(node_list => {
            oscillator.disconnect();
            //oscillator.stop();
            play_music(node_list, to_start);
        }, time_map[node[1]], node_list)
    }

    window.music_editor_toggle = function () {
        if (music_editor_mode == 'graph') {
            $('#music_graph_scroll_area').css('display', 'none');
            $('#music_editor_text').css('display', 'inline-block');
            $('#music_editor_text').val(music_graph.to_text());
            music_editor_mode = 'text';
        }
        else if (music_editor_mode == 'text') {
            $('#music_graph_scroll_area').css('display', 'block');
            $('#music_editor_text').css('display', 'none');
            music_graph.from_text($('#music_editor_text').val());
            music_graph.set_rows(Math.ceil((music_graph.node_list.length + 1) / music_graph.nodes_per_rows));
            music_graph.draw();
            music_editor_mode = 'graph';
        }
    }

    window.create_node = function (field, value, sharp, time, time_point) {
        var node = {};
        node.field = field || '';
        node.value = value || '1';
        node.sharp = sharp || false;
        node.time = time || '4';
        node.time_point = time_point || false;
        node.fre_is_valid = function () {
            var fre = node.field + node.value + (this.sharp ? '#' : '');
            return fre_map[fre] !== undefined;
        }
        node.time_is_valid = function () {
            var time = parseInt(this.time);
            if (this.time_point)
                time += time * 2;
            return time_map[time + ''] !== undefined;
        }
        node.is_valid = function () {
            return this.fre_is_valid() && this.time_is_valid();
        }
        node.field_up = function () {
            var field = this.field;
            if (this.field === '' || this.field[0] === '+') {
                this.field += '+';
            }
            else if (this.field[0] === '-') {
                this.field = this.field.slice(0, -1);
            }
            if (this.fre_is_valid()) {
                return true;
            }
            else {
                this.field = field;
                return false;
            }
        }
        node.field_down = function () {
            var field = this.field;
            if (this.field === '' || this.field[0] === '-') {
                this.field += '-';
            }
            else if (this.field[0] === '+') {
                this.field = this.field.slice(0, -1);
            }
            if (this.fre_is_valid()) {
                return true;
            }
            else {
                this.field = field;
                return false;
            }
        }
        node.value_add = function () {
            var value = parseInt(this.value);
            if (value < 7) {
                value += 1;
            }
            else if (value == 7) {
                this.value = '1';
                if (this.field_up()) {
                    return true;
                }
                this.value = value + '';
                return false;
            }
            var old_value = this.value;
            this.value = value + '';
            if (this.fre_is_valid()) {
                return true;
            }
            else {
                this.value = old_value;
                return false;
            }
        }
        node.value_minus = function () {
            var value = parseInt(this.value);
            if (value > 1) {
                value -= 1;
            }
            else if (value == 1) {
                this.value = '7';
                if (this.field_down()) {
                    return true;
                }
                this.value = value + '';
                return false;
            }
            var old_value = this.value;
            this.value = value + '';
            if (this.fre_is_valid()) {
                return true;
            }
            else {
                this.value = old_value;
                return false;
            }
        }
        node.time_longer = function () {
            var time = parseInt(this.time);
            if (time <= 1)
                return false;
            time /= 2;
            this.time = time + '';
            return true;
        }
        node.time_shorter = function () {
            var time = parseInt(this.time);
            if (time >= 32)
                return false;
            time *= 2;
            this.time = time + '';
            return true;
        }
        node.sharp_toggle = function () {
            this.sharp = !this.sharp;
            if (this.fre_is_valid())
                return true;
            this.sharp = !this.sharp;
            return false;
        }
        node.time_point_toggle = function () {
            this.time_point = !this.time_point;
            if (this.time_is_valid())
                return true;
            this.time_point = !this.time_point;
            return false;
        }
        node.to_data = function () {
            var fre = node.field + node.value + (this.sharp ? '#' : '');
            var time = parseInt(this.time);
            if (this.time_point)
                time += time * 2;
            return [fre, time + ''];
        }
        node.to_text = function () {
            var fre = node.field + node.value + (this.sharp ? '#' : '');
            var time = parseInt(this.time);
            if (this.time_point)
                time += time * 2;
            return fre + ',' + time;
        }
        return node;
    }

    var music_graph = {};

    music_graph.init = function () {
        this.canvas = $('canvas').get(2);
        this.canvas_jquery = $('#music_editor_graph');
        this.canvas.onkeydown = function (event) {
            var key = event.which || event.keyCode;
            key = parseInt(key);
            if (key == 37) {
                (music_graph.select > 0) && (--music_graph.select);
            }
            else if (key == 38) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].value_add());
            }
            else if (key == 39) {
                (music_graph.select < music_graph.node_list.length - 1) && (++music_graph.select);
            }
            else if (key == 40) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].value_minus());
            }
            else if (key == 110 || key == 17) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].time_point_toggle());
            }
            else if (key == 16 || key == 106) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].sharp_toggle());
            }
            else if (key == 33 || key == 221) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].field_up());
            }
            else if (key == 34 || key == 219) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].field_down());
            }
            else if (key == 107 || key == 190) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].time_shorter());
            }
            else if (key == 109 || key == 188) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].time_longer());
            }
            else if (97 <= key && key <= 103) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].value = (key - 96) + '');
            }
            else if (49 <= key && key <= 55) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].value = (key - 48) + '');

            }
            else if (key == 8) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list.splice(music_graph.select, 1), --music_graph.select)
                var rows = Math.ceil((music_graph.node_list.length + 1) / music_graph.nodes_per_rows);
                if (rows != music_graph.rows) {
                    music_graph.set_rows(rows);
                }
            }
            else if (key == 13) {
                music_graph.node_list.splice(++music_graph.select, 0, create_node('', '1', false, '4', false));
                var rows = Math.ceil((music_graph.node_list.length + 1) / music_graph.nodes_per_rows);
                if (rows != music_graph.rows) {
                    music_graph.set_rows(rows);
                }
            }
            else {
                console.log(key);
                return;
            }
            event.preventDefault();
            music_graph.draw();
        }
        this.canvas_jquery.mousedown(function (e) {
            var x = e.originalEvent.x || e.originalEvent.layerX || 0;
            var y = e.originalEvent.y || e.originalEvent.layerY || 0;
            x -= music_graph.canvas_jquery.offset().left;
            y -= music_graph.canvas_jquery.offset().top;
            var row = parseInt(y / music_graph.row_height) - 1;
            (row < 0) && (row = 0);
            (row >= music_graph.rows) && (row = music_graph.rows - 1);
            var col = parseInt((x - music_graph.node_line_padding_left) / music_graph.node_width);
            (col < 0) && (col = 0);
            (col >= music_graph.nodes_per_rows) && (col = music_graph.nodes_per_rows - 1);
            var index = row * music_graph.nodes_per_rows + col;
            (index >= music_graph.node_list.length) && (index = music_graph.node_list.length - 1);
            if (music_graph.select != index) {
                music_graph.select = index;
                music_graph.draw();
            }
        });
        this.context = this.canvas.getContext('2d');
        this.context.draw_circle = game_context.draw_circle;
        this.context.draw_round_rect = game_context.draw_round_rect;
        this.context.draw_ellipse = function (x, y, a, b, stroke_color, fill_color, line_width, skew) {
            this.save();
            if (skew) {
                this.translate(x, y);
                this.rotate(skew);
                this.translate(-x, -y);
            }
            var r = (a > b) ? a : b;
            var ratioX = a / r;
            var ratioY = b / r;
            this.scale(ratioX, ratioY);
            this.beginPath();
            this.arc(x / ratioX, y / ratioY, r, 0, 2 * Math.PI, false);
            this.closePath();
            this.lineWidth = line_width || Math.ceil(a * 0.01);
            if (stroke_color) {
                this.strokeStyle = stroke_color;
                this.stroke();
            }
            if (fill_color) {
                this.fillStyle = fill_color;
                this.fill();
            }
            this.restore();
        }
        this.rows = 1;
        this.nodes_per_rows = 20;
        this.select = -1;
        this.node_list = [];
        this.node_text_regexp = /^\s*([\-\+]*)([1-7]+)(#?),([0-9]+)\s*$/;
        this.update_size();
    }

    music_graph.update_size = function () {
        this.canvas.width = document.body.clientWidth * 0.6;
        this.row_height = this.canvas.width / 10;
        this.line_height = this.row_height / 12;
        this.line_start = this.line_height * 4;
        this.padding_left = this.line_height;
        this.padding_right = this.line_height;
        this.node_line_padding_left = 2 * this.line_height;
        this.node_line_padding_right = 2 * this.line_height;
        this.middle_c_pos = this.line_start + this.line_height * 5;
        this.node_width = (this.canvas.width - this.node_line_padding_left - this.node_line_padding_right) / this.nodes_per_rows;
        this.node_unit_a = this.line_height * 3 / 5;
        this.node_unit_b = this.line_height / 2;
        this.node_unit_padding_left = (this.node_width - this.node_unit_a * 2) / 2;
        this.line_length = this.line_height * 4;
        this.set_rows();
        this.draw();
    }

    music_graph.set_rows = function (rows) {
        this.rows = rows || this.rows;
        this.canvas.height = Math.max(document.body.clientHeight * 0.6, (this.rows + 2) * this.row_height);
        this.canvas.style.height = this.canvas.height + 'px';
    }

    music_graph.draw_rows = function () {
        for (var row = 1; row <= this.rows; ++row) {
            this.context.save();
            this.context.translate(0, row * this.row_height);
            this.context.beginPath();
            this.context.moveTo(0, 0);
            this.context.lineTo(this.canvas.width, 0);
            for (var i = 0; i < 5; ++i) {
                this.context.moveTo(this.padding_left, this.line_start + i * this.line_height);
                this.context.lineTo(this.canvas.width - this.padding_right, this.line_start + i * this.line_height);
            }
            this.context.moveTo(this.padding_left + this.line_height, this.line_start - this.line_height / 2);
            this.context.lineTo(this.padding_left + this.line_height, this.line_start + 4 * this.line_height + this.line_height / 2);
            this.context.moveTo(this.canvas.width - this.line_height - this.padding_right, this.line_start - this.line_height / 2);
            this.context.lineTo(this.canvas.width - this.line_height - this.padding_right, this.line_start + 4 * this.line_height + this.line_height / 2);
            this.context.strokeStyle = 'black';
            this.context.stroke();
            this.context.fillStyle = 'black';
            this.context.fillRect(this.padding_left, this.line_start - this.line_height / 2, this.line_height / 2, 5 * this.line_height);
            this.context.fillRect(this.canvas.width - this.line_height / 2 - this.padding_right, this.line_start - this.line_height / 2, this.line_height / 2, 5 * this.line_height);
            this.context.restore();
        }
    }

    music_graph.draw_nodes = function () {
        for (var i = 0; i < this.node_list.length; ++i) {
            music_graph.draw_node(parseInt(i / this.nodes_per_rows) + 1, i % parseInt(this.nodes_per_rows), this.node_list[i], i);
        }
    }

    music_graph.draw_node = function (row, col, node, index) {
        this.context.save();
        this.context.translate(this.node_line_padding_left + this.node_width * col, this.row_height * row);
        var y = this.middle_c_pos - (parseInt(node.value) - 1) * this.line_height / 2;
        if (node.field.length) {
            y += (node.field[0] == '+' ? -1 : 1) * node.field.length * 7 * this.line_height / 2;
        }

        if (index == this.select) {
            this.context.fillStyle = 'yellow';
            this.context.strokeStyle = 'black';
            this.context.globalAlpha = 0.5;
            this.context.lineWidth = 2;
            this.context.beginPath();
            this.context.rect(this.node_unit_padding_left - this.line_height / 2, y - this.line_height,
                2 * this.line_height, 2 * this.line_height);
            this.context.fill();
            this.context.globalAlpha = 1;
            this.context.stroke();
        }

        var time = parseInt(node.time);
        if (time <= 2) {
            this.context.draw_ellipse(this.node_unit_padding_left + this.node_unit_a, y, this.node_unit_a, this.node_unit_b, 'black', '', 3, -Math.PI / 4);
        }
        else {
            this.context.draw_ellipse(this.node_unit_padding_left + this.node_unit_a, y, this.node_unit_a, this.node_unit_b, '', 'black', '', -Math.PI / 4);
        }

        this.context.beginPath();
        if (y < this.line_start) {
            for (var line_y = this.line_start - this.line_height; line_y > y - this.line_height / 3; line_y -= this.line_height) {
                this.context.moveTo(this.node_unit_padding_left - this.node_unit_a, line_y);
                this.context.lineTo(this.node_unit_padding_left + 3 * this.node_unit_a, line_y);
            }
        }
        else if (y > this.line_start + this.line_height * 4) {
            for (var line_y = this.line_start + this.line_height * 5; line_y < y + this.line_height / 3; line_y += this.line_height) {
                this.context.moveTo(this.node_unit_padding_left - this.node_unit_a, line_y, line_y);
                this.context.lineTo(this.node_unit_padding_left + 3 * this.node_unit_a, line_y);
            }
        }
        if (time >= 2) {
            var n = Math.log2(time) - 2;
            var step = this.line_height * 3 / 4;
            if (y < this.row_height / 2) {
                this.context.moveTo(this.node_unit_padding_left + this.node_unit_a - this.node_unit_a / 1.2, y);
                this.context.lineTo(this.node_unit_padding_left + this.node_unit_a - this.node_unit_a / 1.2, y + this.line_length);
                for (var i = 0; i < n; ++i) {
                    this.context.moveTo(this.node_unit_padding_left + this.node_unit_a - this.node_unit_a / 1.2, y + this.line_length - step * i);
                    this.context.lineTo(this.node_unit_padding_left + this.node_unit_a - this.node_unit_a / 1.2 + this.line_height * 3 / 4, y + this.line_length - 3 / 2 * this.line_height - step * i);
                }
            }
            else {
                this.context.moveTo(this.node_unit_padding_left + this.node_unit_a + this.node_unit_a / 1.2, y);
                this.context.lineTo(this.node_unit_padding_left + this.node_unit_a + this.node_unit_a / 1.2, y - this.line_length);
                for (var i = 0; i < n; ++i) {
                    this.context.moveTo(this.node_unit_padding_left + this.node_unit_a + this.node_unit_a / 1.2, y - this.line_length + step * i);
                    this.context.lineTo(this.node_unit_padding_left + this.node_unit_a + this.node_unit_a / 1.2 + this.line_height * 3 / 4, y - this.line_length + 3 / 2 * this.line_height + step * i);
                }
            }
        }
        this.context.strokeStyle = 'black';
        this.context.lineWidth = 2;
        this.context.stroke();
        if (node.time_point) {
            this.context.draw_circle(this.node_unit_padding_left + this.node_unit_a + this.node_unit_a * 2, y, 2, '', 'black');
        }
        if (node.sharp) {
            this.context.fillStyle = 'black';
            this.context.font = '20px Arial';
            this.context.textAlign = 'center';
            this.context.fillText('#', this.node_unit_padding_left + this.node_unit_a - this.node_unit_a * 2, y + 5);
        }
        this.context.restore();
    }

    music_graph.draw = function () {
        this.canvas.height = this.canvas.height;
        this.draw_rows();
        this.draw_nodes();
    }

    music_graph.to_text = function () {
        var text = '';
        this.node_list.forEach(node => {
            text += node.to_text() + ';';
        });
        return text;
    }

    music_graph.from_text = function (text) {
        var node_list = text.split(';');
        music_graph.node_list = [];
        for (var i = 0; i < node_list.length; ++i) {
            var str = this.node_text_regexp.exec(node_list[i]);
            if (str) {
                var time = parseInt(str[4]);
                var main = Math.floor(Math.log2(time));
                main = Math.pow(2, main);
                var rest = time - main;
                if (rest > 1) {
                    var temp = rest;
                    rest = main;
                    main = temp;
                }
                var node = create_node(str[1], str[2], !!str[3], main, main * 2 == rest);
                if (node.is_valid()) {
                    music_graph.node_list.push(node);
                }
            }
        }
    }

    music_graph.init();

    /*window.create_level_launcher = function () {
        var launcher = {};
        launcher.order_list = new Array(directions.length);
        launcher.text = '';
        launcher.state = 'create';
        launcher.load = function (text) {
            launcher.text = text;
            this.reset();
        }
        launcher.parse_order = function (index) {
            var order = this.order_list[index].shift();
            if (order == undefined)
                return;
            if (order.type != 'delay') {
                keys.push(create_key(dir_params[directions[index]][0], dir_params[directions[index]][1],
                order.speed_time, order.type, order.during_time));
            }
            setTimeout(() => {
                this.parse_order(index);
            }, order.delay);
        }
        launcher.start = function () {
            if (this.state == 'ready') {
                this.state = 'run';
                audio.play();
                for (var i = 0; i < this.order_list.length; ++i) {
                    this.parse_order(i);
                }
            }
        }
        launcher.pause = function () {
            //TODO
        }
        launcher.resume = function () {
            //TODO
        }
        launcher.reset = function () {
            //1:2:3:4,delay,during_time,...;...
            for (var i = 0; i < this.order_list.length; ++i) {
                this.order_list[i] = [];
            }
            var order_list = this.text.split(';');
            for (var i = 0; i < order_list.length; ++i) {
                var unit = order_list[i].trim().split(',');
                if (unit.length != 4 && unit.length != 5)
                    continue;
                var delay = parseInt(unit[1]);
                var speed_time = parseInt(unit[2]);
                var type = unit[3].trim();
                var during_time = parseInt(unit[4]);
                if (isNaN(delay) || isNaN(speed_time) || (type == 'long' && isNaN(during_time)))
                    continue;
                if (unit[0]) {
                    var dir_list = unit[0].split(':');
                    for (var j = 0; j < dir_list.length; ++j) {
                        var index = parseInt(dir_list[j]) - 1;
                        if (this.order_list[index]) {
                            this.order_list[index].push({
                                delay: delay,
                                speed_time: speed_time,
                                type: type,
                                during_time: during_time
                            })
                        }
                    }
                }
            }
            //console.log(this.order_list);
            this.state = 'ready';
        }
        launcher.stop = function () {
            if (this.state != 'stop') {
                this.state = 'stop';
            }
        }
        return launcher;
    }

    var launcher = create_level_launcher();*/

    window.create_scheduler = function () {
        var scheduler = {};
        scheduler.text = '';
        scheduler.state = 'create';
        scheduler.order_list = [];
        scheduler.load = function (text) {
            this.text = text;
            this.reset();
        }
        scheduler.reset = function () {
            this.order_list = [];
            var order_list = this.text.split(';');
            //xxxx.xx,x:x,type,xxx
            for (var i = 0; i < order_list.length; ++i) {
                var unit = order_list[i].trim().split(',');
                if (unit.length != 3 && unit.length != 4)
                    continue;
                var time = parseFloat(unit[0].trim());
                var type = unit[2].trim();
                var during_time = parseInt(unit[3]);
                if ((type != 'single' && type != 'long') || isNaN(time))
                    continue;
                if (type == 'long' && isNaN(during_time))
                    continue;
                if (unit[1]) {
                    var dir_list = unit[1].split(':');
                    var temp = [time];
                    temp.push([]);
                    for (var j = 0; j < dir_list.length; ++j) {
                        var index = parseInt(dir_list[j]) - 1;
                        if (index >= 0 && index < directions.length) {
                            temp[1].push({
                                index: index,
                                type: type,
                                during_time: during_time
                            })
                        }
                    }
                    this.order_list.push(temp);
                }
            }
            this.state = 'ready';
        }
        scheduler.start = function () {
            if (this.state == 'ready') {
                var scheduler = this;
                audio.play();
                (function callee(e) {
                    for (var i = 0; i < scheduler.order_list.length; ++i) {
                        if (scheduler.order_list[i][0] < audio.currentTime) {
                            for (var j = 0; j < scheduler.order_list[i][1].length; ++j) {
                                var order = scheduler.order_list[i][1][j];
                                keys.push(create_key(dir_params[directions[order.index]][0],
                                    dir_params[directions[order.index]][1], speed_time,
                                    order.type, order.during_time));
                                ++score_unit.all;
                                if (order.type == 'long')
                                    score_unit.all += Math.ceil(order.during_time / keys[0].add_score_ticks / timer_interval);
                            }
                        }
                        else {
                            break;
                        }
                    }
                    if (i != 0) {
                        scheduler.order_list.splice(0, i);
                    }
                    if (!audio.paused)
                        requestAnimationFrame(callee);
                    else if (status == 1) {
                        setTimeout(() => {
                            change_page('finish_game');
                        }, game_finish_wait_time);
                    }
                })();
            }
        }
        scheduler.stop = function () {
            //TODO
            if (this.state != 'stop') {
                this.state = 'stop';
            }
        }
        scheduler.pause = function () {
            //TODO
        }
        scheduler.resume = function () {
            //TODO
        }
        return scheduler;
    }

    var scheduler = create_scheduler();

})(window);