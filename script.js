document.addEventListener('DOMContentLoaded', function() {
    // Exibe o alerta assim que a página é carregada
    alert("Ao utilizar esta aplicação, concorda que a foto enviada será exibida no Vídeo Led.");

    // Elementos da página
    const toggleCameraBtn = document.getElementById('toggleCamera');
    const uploadBtn = document.getElementById('uploadBtn');
    const chooseFileBtn = document.getElementById('chooseFile');
    const addTextBtn = document.getElementById('addTextBtn');
    const cameraView = document.getElementById('cameraView');
    const imagePreview = document.getElementById('imagePreview');
    const fileInput = document.getElementById('fileInput');
    const statusDiv = document.getElementById('status');
    const placeholder = document.getElementById('placeholder');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const cameraMenu = document.getElementById('cameraMenu');
    const capturePhotoBtn = document.getElementById('capturePhoto');
    const switchCameraBtn = document.getElementById('switchCamera');
    const exitCameraBtn = document.getElementById('exitCamera');
    const mediaContainer = document.querySelector('.media-container');

    // Elementos dos filtros
    const filtersContainer = document.getElementById('filtersContainer');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const filterIntensity = document.getElementById('filterIntensity');

    // Elementos do editor de texto
    const textToolbar = document.getElementById('textToolbar');
    const textColor = document.getElementById('textColor');
    const changeFont = document.getElementById('changeFont');
    const changeAlign = document.getElementById('changeAlign');
    const finishText = document.getElementById('finishText');

    // Variáveis globais
    let stream = null;
    let currentImage = null;
    const scriptUrl = "https://script.google.com/macros/s/AKfycbx_QNWJB10INetzQBj9mV3spD8qlhO4xFgsmXE_WGkUVKOkOOut_7hle7QY4aTZnDNv2w/exec";
    let activeTextElement = null;
    const fonts = ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'Impact'];
    let currentFontIndex = 0;
    const alignments = [
        { name: 'center', icon: 'fa-align-center' },
        { name: 'left', icon: 'fa-align-left' },
        { name: 'right', icon: 'fa-align-right' }
    ];
    let currentAlignIndex = 0;
    let currentFilter = 'none';
    let currentFilterIntensity = 100;
    let isCameraActive = false;
    let currentFacingMode = 'environment';

    // Função para verificar se é dispositivo móvel
    function isMobileDevice() {
        return /Mobi|Android|iPhone|iPad|iPod|Touch/.test(navigator.userAgent);
    }

    // Habilitar botão de texto quando houver imagem
    function checkImageForText() {
        addTextBtn.disabled = !(imagePreview.style.display === 'block');
    }

    // Mostrar/ocultar filtros quando houver imagem
    function toggleFilters() {
        const hasImage = imagePreview.style.display === 'block';
        filtersContainer.style.display = hasImage ? 'block' : 'none';
    }

    // Observar mudanças na imagem
    const observer = new MutationObserver(function() {
        checkImageForText();
        toggleFilters();
        updateAllTextPositions();
    });
    observer.observe(imagePreview, { attributes: true, attributeFilter: ['style', 'src'] });

    // Função para ajustar a orientação da câmera
    function adjustCameraOrientation() {
        if (!isCameraActive || !isMobileDevice()) return;

        const isLandscape = window.innerWidth > window.innerHeight;
        if (isLandscape) {
            cameraView.classList.add('landscape');
            cameraView.style.objectFit = 'cover';
        } else {
            cameraView.classList.remove('landscape');
            cameraView.style.objectFit = 'contain';
        }
    }

    // Atualizar posições de texto
    function updateTextCSSPosition(element) {
        const imgRect = imagePreview.getBoundingClientRect();
        const containerRect = mediaContainer.getBoundingClientRect();
        const relX = parseFloat(element.dataset.relX) || 0.5;
        const relY = parseFloat(element.dataset.relY) || 0.5;
        const left = (imgRect.left - containerRect.left + relX * imgRect.width) / containerRect.width * 100;
        const top = (imgRect.top - containerRect.top + relY * imgRect.height) / containerRect.height * 100;
        element.style.left = `${left}%`;
        element.style.top = `${top}%`;
    }

    function updateAllTextPositions() {
        document.querySelectorAll('.draggable-text').forEach(updateTextCSSPosition);
    }

    // Evento de resize
    window.addEventListener('resize', () => {
        adjustCameraOrientation();
        updateAllTextPositions();
    });
    if (isMobileDevice()) {
        window.addEventListener('orientationchange', () => {
            adjustCameraOrientation();
            updateAllTextPositions();
        });
    }

    // Adicionar novo texto
    addTextBtn.addEventListener('click', () => {
        const existingText = document.querySelector('.draggable-text');
        if (existingText) return;
        addTextElement('');
    });

    // Criar elemento de texto
    function addTextElement(initialText) {
        const textElement = document.createElement('div');
        textElement.className = 'draggable-text text-active';
        textElement.contentEditable = true;
        textElement.textContent = initialText;
        textElement.style.color = textColor.value;
        textElement.style.fontSize = '24px';
        textElement.style.fontFamily = fonts[currentFontIndex];
        textElement.style.textAlign = alignments[currentAlignIndex].name;
        textElement.style.position = 'absolute';
        textElement.style.transform = 'translate(-50%, -50%)';
        textElement.style.whiteSpace = 'pre-wrap';
        textElement.dataset.relX = 0.5;
        textElement.dataset.relY = 0.5;

        makeTextManipulable(textElement);

        textElement.addEventListener('click', (e) => {
            e.stopPropagation();
            selectTextElement(textElement);
            if (isMobileDevice()) textElement.focus();
        });

        textElement.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            selectTextElement(textElement);
            textElement.focus();
        }, { passive: false });

        mediaContainer.appendChild(textElement);
        updateTextCSSPosition(textElement);
        selectTextElement(textElement);
        textElement.focus();
    }

    // Selecionar elemento de texto
    function selectTextElement(element) {
        if (activeTextElement) {
            activeTextElement.classList.remove('text-active');
            activeTextElement.contentEditable = false;
        }
        activeTextElement = element;
        element.classList.add('text-active');
        element.contentEditable = true;
        textToolbar.style.display = 'block';

        textColor.value = rgbToHex(element.style.color) || '#000000';
        const fontFamily = element.style.fontFamily.replace(/['"]/g, '') || 'Arial';
        currentFontIndex = fonts.indexOf(fontFamily);
        if (currentFontIndex === -1) currentFontIndex = 0;
        changeFont.textContent = fonts[currentFontIndex];
        const textAlign = element.style.textAlign || 'center';
        currentAlignIndex = alignments.findIndex(align => align.name === textAlign);
        if (currentAlignIndex === -1) currentAlignIndex = 0;
        changeAlign.innerHTML = `<i class="fas ${alignments[currentAlignIndex].icon}"></i>`;
    }

    // Tornar elemento manipulável
    function makeTextManipulable(element) {
        let isDragging = false;
        let isMultiTouch = false;
        let initialRelX = 0;
        let initialRelY = 0;
        let initialMouseX = 0;
        let initialMouseY = 0;
        let initialFontSize = parseFloat(element.style.fontSize) || 24;
        let initialRotation = 0;
        let initialDistance = 0;
        let initialAngle = 0;

        function getTouchDistance(touch1, touch2) {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        function getTouchAngle(touch1, touch2) {
            return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * 180 / Math.PI;
        }

        function startManipulation(e) {
            e.preventDefault();
            e.stopPropagation();

            const touches = e.touches || [e];
            if (touches.length === 1) {
                isDragging = true;
                isMultiTouch = false;
                initialMouseX = touches[0].clientX;
                initialMouseY = touches[0].clientY;
                initialRelX = parseFloat(element.dataset.relX) || 0.5;
                initialRelY = parseFloat(element.dataset.relY) || 0.5;
                element.classList.add('dragging');
            } else if (touches.length === 2) {
                isDragging = false;
                isMultiTouch = true;
                initialFontSize = parseFloat(element.style.fontSize) || 24;
                initialRotation = element.style.transform.match(/rotate\(([^)]+)\)/) ? 
                    parseFloat(element.style.transform.match(/rotate\(([^)]+)\)/)[1]) : 0;
                initialDistance = getTouchDistance(touches[0], touches[1]);
                initialAngle = getTouchAngle(touches[0], touches[1]);
                element.classList.add('dragging');
            }
        }

        function manipulate(e) {
            if (!isDragging && !isMultiTouch) return;
            e.preventDefault();
            e.stopPropagation();

            const touches = e.touches || [e];
            if (isDragging && touches.length === 1) {
                const event = touches[0];
                const dx = event.clientX - initialMouseX;
                const dy = event.clientY - initialMouseY;
                const imgRect = imagePreview.getBoundingClientRect();
                let relX = initialRelX + dx / imgRect.width;
                let relY = initialRelY + dy / imgRect.height;
                relX = Math.max(0, Math.min(1, relX));
                relY = Math.max(0, Math.min(1, relY));
                element.dataset.relX = relX;
                element.dataset.relY = relY;
                updateTextCSSPosition(element);
            } else if (isMultiTouch && touches.length === 2) {
                const currentDistance = getTouchDistance(touches[0], touches[1]);
                const currentAngle = getTouchAngle(touches[0], touches[1]);
                const scaleFactor = currentDistance / initialDistance;
                const newFontSize = Math.max(12, Math.min(100, initialFontSize * scaleFactor));
                const deltaAngle = currentAngle - initialAngle;
                const newRotation = initialRotation + deltaAngle;

                element.style.fontSize = `${newFontSize}px`;
                element.style.transform = `translate(-50%, -50%) rotate(${newRotation}deg)`;
            }
        }

        function stopManipulation() {
            isDragging = false;
            isMultiTouch = false;
            element.classList.remove('dragging');
        }

        element.addEventListener('mousedown', startManipulation);
        document.addEventListener('mousemove', manipulate);
        document.addEventListener('mouseup', stopManipulation);

        element.addEventListener('touchstart', startManipulation, { passive: false });
        document.addEventListener('touchmove', manipulate, { passive: false });
        document.addEventListener('touchend', stopManipulation);
        document.addEventListener('touchcancel', stopManipulation);

        element.addEventListener('dragstart', (e) => e.preventDefault());
    }

    textColor.addEventListener('input', () => {
        if (activeTextElement) activeTextElement.style.color = textColor.value;
    });

    changeFont.addEventListener('click', () => {
        currentFontIndex = (currentFontIndex + 1) % fonts.length;
        changeFont.textContent = fonts[currentFontIndex];
        if (activeTextElement) activeTextElement.style.fontFamily = fonts[currentFontIndex];
    });

    changeAlign.addEventListener('click', () => {
        currentAlignIndex = (currentAlignIndex + 1) % alignments.length;
        changeAlign.innerHTML = `<i class="fas ${alignments[currentAlignIndex].icon}"></i>`;
        if (activeTextElement) activeTextElement.style.textAlign = alignments[currentAlignIndex].name;
    });

    finishText.addEventListener('click', () => {
        if (activeTextElement) {
            activeTextElement.classList.remove('text-active');
            activeTextElement.contentEditable = false;
            activeTextElement = null;
            textToolbar.style.display = 'none';
        }
    });

    mediaContainer.addEventListener('click', (e) => {
        if (e.target === mediaContainer) {
            if (activeTextElement) {
                activeTextElement.classList.remove('text-active');
                activeTextElement.contentEditable = false;
                activeTextElement = null;
                textToolbar.style.display = 'none';
            }
        }
    });

    function rgbToHex(rgb) {
        if (!rgb || !rgb.startsWith('rgb')) return '#000000';
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match) return rgb;
        function hex(x) {
            return ("0" + parseInt(x).toString(16)).slice(-2);
        }
        return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
    }

    // Funcionalidades de câmera e imagem
    toggleCameraBtn.addEventListener('click', async () => {
        if (!isCameraActive) {
            try {
                resetStatus();
                placeholder.style.display = 'none';
                imagePreview.style.display = 'none';
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: currentFacingMode,
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                });
                cameraView.srcObject = stream;
                cameraView.style.display = 'block';
                cameraMenu.style.display = 'block';
                mediaContainer.classList.add('fullscreen');
                uploadBtn.disabled = true;
                addTextBtn.disabled = true;
                isCameraActive = true;
                adjustCameraOrientation();
                showStatus("Câmera ativada.", 'info');
            } catch (err) {
                showError("Erro ao acessar a câmera: " + err.message);
                mediaContainer.classList.remove('fullscreen');
            }
        }
    });

    capturePhotoBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = cameraView.videoWidth;
        canvas.height = cameraView.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cameraView, 0, 0, canvas.width, canvas.height);

        cameraView.style.filter = 'brightness(2)';
        setTimeout(() => cameraView.style.filter = 'brightness(1)', 300);

        currentImage = canvas.toDataURL('image/jpeg', 0.9);
        imagePreview.src = currentImage;
        imagePreview.style.display = 'block';
        cameraView.style.display = 'none';
        cameraMenu.style.display = 'none';
        mediaContainer.classList.remove('fullscreen');

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        isCameraActive = false;
        uploadBtn.disabled = false;
        addTextBtn.disabled = false;
        showStatus("", 'info');
        updateAllTextPositions();
    });

    switchCameraBtn.addEventListener('click', async () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: currentFacingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            cameraView.srcObject = stream;
            cameraView.style.display = 'block';
            showStatus(`Câmera alternada para ${currentFacingMode === 'environment' ? 'traseira' : 'frontal'}.`, 'info');
        } catch (err) {
            showError("Erro ao alternar câmera: " + err.message);
        }
    });

    exitCameraBtn.addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraView.style.display = 'none';
        cameraMenu.style.display = 'none';
        placeholder.style.display = 'flex';
        mediaContainer.classList.remove('fullscreen');
        isCameraActive = false;
        uploadBtn.disabled = true;
        addTextBtn.disabled = true;
        resetStatus();
    });

    chooseFileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.match('image.*')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                resetStatus();
                placeholder.style.display = 'none';
                currentImage = event.target.result;
                imagePreview.src = currentImage;
                imagePreview.style.display = 'block';
                cameraView.style.display = 'none';
                cameraMenu.style.display = 'none';
                mediaContainer.classList.remove('fullscreen');
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
                uploadBtn.disabled = false;
                addTextBtn.disabled = false;
                showStatus("Imagem selecionada.", 'info');
                updateAllTextPositions();
            };
            reader.readAsDataURL(file);
        } else {
            showError("Selecione um arquivo de imagem válido.");
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            applyFilter();
        });
    });

    function applyFilter() {
        if (!currentImage) return;
        const intensity = currentFilterIntensity / 100;
        let filterValue = currentFilter === 'none' ? 'none' : currentFilter.replace(/([\d.]+)(%|px|deg)/g, (match, number, unit) => {
            return `${parseFloat(number) * intensity}${unit}`;
        });
        imagePreview.style.filter = filterValue;
    }

    filterIntensity.addEventListener('input', () => {
        currentFilterIntensity = filterIntensity.value;
        applyFilter();
    });

    uploadBtn.addEventListener('click', async () => {
        if (!currentImage) {
            showError("Nenhuma imagem para enviar");
            return;
        }
        try {
            uploadBtn.disabled = true;
            showStatus("Enviando imagem...", 'info');
            progressContainer.style.display = 'block';
            simulateUploadProgress();

            const canvas = document.createElement('canvas');
            const img = new Image();
            await new Promise(resolve => { img.onload = resolve; img.src = currentImage; });
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.filter = imagePreview.style.filter || 'none';
            ctx.drawImage(img, 0, 0);

            const textElements = document.querySelectorAll('.draggable-text');
            textElements.forEach(el => {
                const text = el.textContent;
                const color = el.style.color || '#000';
                const fontSize = parseInt(el.style.fontSize) || 24;
                const fontFamily = el.style.fontFamily.replace(/['"]/g, '') || 'Arial';
                const textAlign = el.style.textAlign || 'center';
                const relX = parseFloat(el.dataset.relX) || 0.5;
                const relY = parseFloat(el.dataset.relY) || 0.5;
                const x = relX * canvas.width;
                const y = relY * canvas.height;

                const previewRect = imagePreview.getBoundingClientRect();
                const scale = canvas.width / previewRect.width;
                const scaledFont = fontSize * scale;

                ctx.save();
                ctx.translate(x, y);
                const tf = el.style.transform.match(/rotate\(([^)]+)\)/);
                const rotation = tf ? parseFloat(tf[1]) * Math.PI / 180 : 0;
                ctx.rotate(rotation);
                ctx.font = `${scaledFont}px ${fontFamily}`;
                ctx.fillStyle = color;
                ctx.textAlign = textAlign;
                ctx.textBaseline = 'middle';
                ctx.fillText(text, 0, 0);
                ctx.restore();
            });

            const finalImage = canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = finalImage.split(',')[1];

            const response = await fetch(scriptUrl, {
                method: 'POST',
                body: base64Data
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.success) {
                showStatus(`Imagem enviada com sucesso!`, 'success');
                uploadBtn.disabled = true;
                currentImage = null;
                setTimeout(resetInterface, 5000);
            } else {
                showError("Erro ao enviar: " + (result.error || "Desconhecido"));
                uploadBtn.disabled = false;
            }
        } catch (err) {
            showError("Falha no envio: " + err.message);
            uploadBtn.disabled = false;
        } finally {
            progressContainer.style.display = 'none';
        }
    });

    function showStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
        statusDiv.style.display = 'block';
    }

    function showError(message) {
        showStatus(message, 'error');
    }

    function resetStatus() {
        statusDiv.style.display = 'none';
    }

    function resetInterface() {
        placeholder.style.display = 'flex';
        imagePreview.style.display = 'none';
        cameraView.style.display = 'none';
        cameraMenu.style.display = 'none';
        mediaContainer.classList.remove('fullscreen');
        resetStatus();
        uploadBtn.disabled = true;
        addTextBtn.disabled = true;
        fileInput.value = '';
        document.querySelectorAll('.draggable-text').forEach(el => el.remove());
        textToolbar.style.display = 'none';
        imagePreview.style.filter = 'none';
        currentFilter = 'none';
        filterBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="none"]').classList.add('active');
        filterIntensity.value = 100;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        isCameraActive = false;
    }

    function simulateUploadProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }, 300);
    }

    // Inicializar
    addTextBtn.disabled = true;
    uploadBtn.disabled = true;
});