/// <reference path='jquery-3.2.1.min.js' />

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

    var speed_time = 1.5;

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
    var directions = ['left', 'up', 'right', 'down'];
    var dir_params = { 'left': [false, true], 'up': [true, true], 'right': [false, false], 'down': [true, false] };
    var press = new Array(directions.length);
    var key_size = 20;
    var handle_size = game_canvas.height < game_canvas.width ? game_canvas.height : game_canvas.width;
    handle_size /= 3;
    var score;
    var miss;
    var status = 0;
    var perf_interval = 0.04; //perfect interval
    var good_interval = 0.08;
    var combo = 0;
    var is_combo = false;

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
        if (cur_page.prop('id') === page)
            return;
        switch (page) {
            case 'level_mode':
                break;
            case 'free_mode':
                break;
            case 'about_game':
                break;
            case 'start_page':
                if (main_timer) {
                    clearInterval(main_timer);
                }
                status = 0;
                $('audio').get(0).pause();
                break;
            case 'start_game':
                start_game(cur_page.prop('id'));
                break;
            case 'create_music':
                music_graph.draw();
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
                var files = $('#file_input_level').get(0).files;
                var reader = new FileReader();
                if (files.length) {
                    var file = files[0];
                    if (/text+/.test(file.type)) {
                        reader.onload = function () {
                            launcher.load(this.result);
                            on_start(mode);
                        }
                    }
                    reader.readAsText(file);
                }
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
            default:
                break;
        }
    }

    window.onresize = function () {
        game_canvas.width = document.body.clientWidth;
        game_canvas.height = document.body.clientHeight;
        handle_size = game_canvas.height < game_canvas.width ? game_canvas.height : game_canvas.width;
        handle_size /= 3;
        keys.forEach(key => {
            key.r = handle_size / 4;
        });
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
            if (keys[i].is_top_left == is_top_left && keys[i].is_vertical == is_vertical) {
                if (keys[i].pos > rate - perf_interval && keys[i].pos < rate + perf_interval) {
                    //perfect
                    console.log("perfect");
                }
                else if (keys[i].pos > rate - good_interval && keys[i].pos < rate + good_interval) {
                    console.log("good");
                }
                else
                    continue;
                keys.splice(i, 1);
                add_score();
                break;
            }
        }
    }

    window.add_score = function () {
        if (!is_combo)
            is_combo = true;
        if (combo > 40)
            score += 5;
        else if (combo > 20)
            score += 3;
        else
            score += 1;
        document.getElementById("score").innerHTML = "Score :" + score;
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
        key.speed = (() => {
            var rate = handle_size / (is_vertical ? game_canvas.height : game_canvas.width) / 2;
            return (0.5 - rate) * timer_interval / speed_time;
        })();
        key.update = function () {
            this.pos += this.is_top_left ? this.speed : -this.speed;
        }
        return key;
    }

    window.draw_key = function (key) {
        game_context.save();
        if (key.is_vertical) {
            var x = game_canvas.width / 2;
            var y = key.pos * game_canvas.height;
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
            //key.smaller_rate /= 1.2;
        }
        else {
            game_context.drawImage(arrow_down, -key.r / 2, -key.r / 2, key.r, key.r);
        }
        game_context.restore();
    }

    window.draw_all = function () {
        game_canvas.height = game_canvas.height;
        draw_handle();
        keys.forEach(key => {
            draw_key(key);
        });
    }

    window.update_all = function () {
        for (var i = 0; i < keys.length; ++i) {
            keys[i].update();
            var rate = handle_size / (keys[i].is_vertical ? game_canvas.height : game_canvas.width) / 9;
            if (keys[i].is_top_left ? keys[i].pos > 0.5 - rate : keys[i].pos < 0.5 + rate) {
                is_combo = false;
                combo = 0;
                keys.splice(i, 1);
                --i;
                continue;
            }
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
        else if (mode == 'level_mode') {
            launcher.start();
        }
    }

    window.init_game = function () {
        keys = [];
        for (var i = 0; i < directions.length; ++i)
            press[i] = false;
        score = 0;
        miss = 0;
        status = 1;
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
        status = 1;
        play_music(node_list, to_start);
    }

    window.play_music = function (node_list, to_start) {
        if (!status)
            return;
        var node = node_list.shift();
        if (node == undefined)
            return;
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
        gainNode.connect(delay);
        oscillator.frequency.value = fre_map[node[0]];
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(20, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + time_map[node[1]] / 1000);
        oscillator.type = 'sine';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + time_map[node[1]]);
        if (to_start) {
            keys.push(create_key(parseInt(Math.random() * 124253) % 2, parseInt(Math.random() * 5798321) % 2, 1500));
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
        this.canvas = $('canvas').get(1);
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
            else if (key == 110) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].time_point_toggle());
            }
            else if (key == 51 || key == 106) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].sharp_toggle());
            }
            else if (key == 33) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].field_up());
            }
            else if (key == 34) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].field_down());
            }
            else if (key == 107) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].time_shorter());
            }
            else if (key == 109) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].time_longer());
            }
            else if (97 <= key && key <= 103) {
                (music_graph.node_list[music_graph.select]) && (music_graph.node_list[music_graph.select].value = (key - 96) + '');
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

    window.create_level_launcher = function () {
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
                console.log(this.order_list);
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
                if (isNaN(delay) || isNaN(speed_time) || (type != 'single' && isNaN(during_time)))
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

    var launcher = create_level_launcher();

})(window);