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

    var game_canvas = $('canvas').get(0);
    var game_context = game_canvas.getContext('2d');
    game_canvas.width = document.body.clientWidth;
    game_canvas.height = document.body.clientHeight;
    var handle = new Image();
    handle.src = '/res/img/handle.png';
    var handle_up = new Image();
    handle_up.src = 'res/img/handle_up.png';
    var arrow_down = new Image();
    arrow_down.src = 'res/img/arrow_down.png';
    var press = '';
    var timer_interval = 30;
    var main_timer = undefined;
    var keys = [];
    var key_size = 20;
    var handle_size = game_canvas.height < game_canvas.width ? game_canvas.height : game_canvas.width;
    handle_size /= 2;

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
                $('audio').get(0).pause();
                break;
            case 'start_game':
                start_game(cur_page.prop('id'));
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
                break;
            case 'free_mode':
                var files = $('#file_input').get(0).files;
                var reader = new FileReader();
                if (files.length) {
                    var file = files[0];
                    if (/audio+/.test(file.type)) {
                        reader.onload = function () {
                            $('audio').attr('src', this.result);
                            on_start();
                        }
                    }
                    reader.readAsDataURL(file);
                }
                else {
                    $('audio').attr('src', 'res/music/test.wav');
                    on_start();
                }
                break;
            default:
                break;
        }
    }

    window.onresize = function () {
        game_canvas.width = document.body.clientWidth;
        game_canvas.height = document.body.clientHeight;
        handle_size = game_canvas.height < game_canvas.width ? game_canvas.height : game_canvas.width;
        handle_size /= 2;
        draw_all();
    }

    window.onkeydown = function (event) {
        var key = event.which || event.keyCode;
        if (key == 37) {
            press = 'left';
        }
        else if (key == 38) {
            press = 'up';
        }
        else if (key == 39) {
            press = 'right';
        }
        else if (key == 40) {
            press = 'down'
        }
        else {
            return;
        }
        event.preventDefault();
    }

    window.onkeyup = function (event) {
        var key = event.which || event.keyCode;
        if ((key == 37 && press == 'left') || (key == 38 && press == 'up') ||
            (key == 39 && press == 'right') || (key == 40 && press == 'down')) {
            press = '';
        }
        else {
            return;
        }
        event.preventDefault();
    }

    window.draw_handle = function () {
        game_context.drawImage(handle, (game_canvas.width - handle_size) / 2,
            (game_canvas.height - handle_size) / 2, handle_size, handle_size);
        game_context.save();
        game_context.translate(game_canvas.width / 2, game_canvas.height / 2);
        switch (press) {
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
        game_context.translate(-game_canvas.width / 2, -game_canvas.height / 2);
        game_context.drawImage(handle_up, (game_canvas.width - handle_size) / 2,
           (game_canvas.height - handle_size) / 2, handle_size, handle_size);
        game_context.restore();
    }

    window.create_key = function (is_vertical, is_top_left, during_time) {
        var key = {};
        key.r = key_size;
        key.is_vertical = is_vertical;
        key.is_top_left = is_top_left;
        key.during = during_time;
        key.pos = is_top_left ? 0 : 1;
        key.speed = (function () {
            var rate = handle_size / (this.is_vertical ? game_canvas.height : game_canvas.width) / 2;
            return (0.5 - rate) * timer_interval / during_time;
        })();
        key.update = function () {
            this.pos += this.is_top_left ? this.speed : -this.speed;
        }
        return key;
    }

    window.draw_key = function (key) {
        if (key.is_vertical) {
            var x = game_canvas.width / 2;
            game_context.draw_circle(x, key.pos * game_canvas.height, key.r, '', 'blue');
        }
        else {
            var y = game_canvas.height / 2;
            game_context.draw_circle(key.pos * game_canvas.width, y, key.r, '', 'blue');
        }
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
            var rate = handle_size / (keys[i].is_vertical ? game_canvas.height : game_canvas.width) / 2;
            if (keys[i].is_top_left ? keys[i].pos > 0.5 - rate : keys[i].pos < 0.5 + rate) {
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

    window.on_start = function () {
        init_game();
        main_timer = setInterval(timer_update, timer_interval);
        start_schedule();
    }

    window.init_game = function () {
        keys = [];
        press = '';
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
                    keys.push(create_key(parseInt(Math.random() * 124253) % 2,
                        parseInt(Math.random() * 5798321) % 2, 1500));
                }
                timer_key = setTimeout(k => {
                    timer_key = undefined;
                }, 100, i);
            }
            if (!audio.paused)
                requestAnimationFrame(callee);
        })();
    }

})(window);