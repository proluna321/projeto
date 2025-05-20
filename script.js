document.addEventListener('DOMContentLoaded', function() {
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
    });
    observer.observe(imagePreview, { attributes: true, attributeFilter: ['style'] });
    observer.observe(cameraView, { attributes: true, attributeFilter: ['style'] });

    // ========== FUNCIONALIDADES DE TEXTO ==========
    // Adicionar novo texto
    addTextBtn.addEventListener('click', (e) => {
        const existingText = document.querySelector('.draggable-text');
        if (existingText) {
            return;
        }

        const isMobile = isMobileDevice();
        let x = '50%';
        let y = '50%';
        
        if (isMobile && e.type === 'touchstart') {
            const touch = e.touches[0];
            const rect = mediaContainer.getBoundingClientRect();
            x = `${((touch.clientX - rect.left) / rect.width) * 100}%`;
            y = `${((touch.clientY - rect.top) / rect.height) * 100}%`;
        }
        
        addTextElement('', x, y);
    });

    // Criar elemento de texto
    function addTextElement(initialText, x = '50%', y = '50%') {
        const textElement = document.createElement('div');
        textElement.className = 'draggable-text text-active';
        textElement.contentEditable = true;
        textElement.textContent = initialText;
        textElement.style.color = textColor.value;
        textElement.style.fontSize = '24px';
        textElement.style.fontFamily = fonts[currentFontIndex];
        textElement.style.textAlign = alignments[currentAlignIndex].name;
        textElement.style.left = x;
        textElement.style.top = y;
        textElement.style.transform = 'translate(-50%, -50%)';
        textElement.style.whiteSpace = 'pre-wrap';

        makeTextManipulable(textElement);

        textElement.addEventListener('click', (e) => {
            e.stopPropagation();
            selectTextElement(textElement);
            if (isMobileDevice()) {
                textElement.focus();
            }
        });

        textElement.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            selectTextElement(textElement);
            textElement.focus();
        }, { passive: false });

        mediaContainer.appendChild(textElement);
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
        const fontFamily = element.style.fontFamily || 'Arial';
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
        let isPinching = false;
        let initialX = 0;
        let initialY = 0;
        let currentX = 0;
        let currentY = 0;
        let initialDistance = 0;
        let initialAngle = 0;
        let currentScale = 1;
        let currentRotation = 0;

        function getTransform() {
            const transform = element.style.transform.match(/scale\(([^)]+)\)|rotate\(([^)]+)\)/g) || [];
            transform.forEach(t => {
                if (t.includes('scale')) {
                    currentScale = parseFloat(t.match(/scale\(([^)]+)\)/)[1]) || 1;
                }
                if (t.includes('rotate')) {
                    currentRotation = parseFloat(t.match(/rotate\(([^)]+)\)/)[1]) || 0;
                }
            });
        }

        function startManipulation(e) {
            e.preventDefault();
            e.stopPropagation();

            const isMobile = isMobileDevice();
            getTransform();

            if (isMobile && e.type === 'touchstart' && e.touches.length === 2) {
                isPinching = true;
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialDistance = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                );
                initialAngle = Math.atan2(
                    touch2.clientY - touch1.clientY,
                    touch2.clientX - touch1.clientX
                );
                element.classList.add('dragging');
            } else if (e.type === 'touchstart' || e.type === 'mousedown') {
                isDragging = true;
                const event = e.type === 'touchstart' ? e.touches[0] : e;
                initialX = event.clientX - currentX;
                initialY = event.clientY - currentY;
                element.classList.add('dragging');
            }

            element.style.userSelect = 'none';
            document.body.style.userSelect = 'none';
            element.style.cursor = isPinching ? 'grabbing' : 'move';
        }

        function manipulate(e) {
            if (!isDragging && !isPinching) return;

            e.preventDefault();
            e.stopPropagation();

            const rect = mediaContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            if (isPinching && e.type === 'touchmove' && e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                );
                const currentAngle = Math.atan2(
                    touch2.clientY - touch1.clientY,
                    touch2.clientX - touch1.clientX
                );

                const scaleFactor = currentDistance / initialDistance;
                const newScale = Math.max(0.5, Math.min(currentScale * scaleFactor, 3));
                const angleDiff = (currentAngle - initialAngle) * (180 / Math.PI);
                const newRotation = currentRotation + angleDiff;

                element.style.transform = `translate(-50%, -50%) scale(${newScale}) rotate(${newRotation}deg)`;
 ге
                initialDistance = currentDistance;
                initialAngle = currentAngle;
                currentScale = newScale;
                currentRotation = newRotation;
            } else if (isDragging) {
                const event = e.type === 'touchmove' ? e.touches[0] : e;
                let newX = event.clientX - initialX;
                let newY = event.clientY - initialY;

                const minX = 0;
                const minY = 0;
                const maxX = rect.width - elementRect.width;
                const maxY = rect.height - elementRect.height;

                newX = Math.max(minX, Math.min(newX, maxX));
                newY = Math.max(minY, Math.min(newY, maxY));

                currentX = newX;
                currentY = newY;
                element.style.left = `${(newX / rect.width) * 100}%`;
                element.style.top = `${(newY / rect.height) * 100}%`;
            }
        }

        function stopManipulation() {
            isDragging = false;
            isPinching = false;
            element.style.userSelect = '';
            document.body.style.userSelect = '';
            element.style.cursor = 'move';
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

    // Atualizar cor em tempo real
    textColor.addEventListener('input', () => {
        if (activeTextElement) {
            activeTextElement.style.color = textColor.value;
        }
    });

    // Mudar fonte
    changeFont.addEventListener('click', () => {
        currentFontIndex = (currentFontIndex + 1) % fonts.length;
        changeFont.textContent = fonts[currentFontIndex];
        if (activeTextElement) {
            activeTextElement.style.fontFamily = fonts[currentFontIndex];
        }
    });

    // Mudar alinhamento
    changeAlign.addEventListener('click', () => {
        currentAlignIndex = (currentAlignIndex + 1) % alignments.length;
        changeAlign.innerHTML = `<i class="fas ${alignments[currentAlignIndex].icon}"></i>`;
        if (activeTextElement) {
            activeTextElement.style.textAlign = alignments[currentAlignIndex].name;
        }
    });

    // Finalizar edição
    finishText.addEventListener('click', () => {
        if (activeTextElement) {
            activeTextElement.classList.remove('text-active');
            activeTextElement.contentEditable = false;
            activeTextElement = null;
            textToolbar.style.display = 'none';
        }
    });

    // Desselecionar texto ao clicar no container
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

    // Converter RGB para HEX
    function rgbToHex(rgb) {
        if (!rgb) return '#000000';
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match) return rgb;
        function hex(x) {
            return ("0" + parseInt(x).toString(16)).slice(-2);
        }
        return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
    }

    // ========== FUNCIONALIDADES DE CÂMERA E IMAGEM ==========
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
                
                cameraView.onloadedmetadata = () => {
                    cameraView.style.width = '100%';
                    cameraView.style.height = '100%';
                    cameraView.style.maxWidth = '100%';
                    cameraView.style.maxHeight = '100%';
                };
                
                showStatus("Câmera ativada. Use os botões para capturar, alternar ou sair.", 'info');
            } catch (err) {
                showError("Erro ao acessar a câmera: " + err.message);
                mediaContainer.classList.remove('fullscreen');
            }
        }
    });

    capturePhotoBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        const videoWidth = cameraView.videoWidth;
        const videoHeight = cameraView.videoHeight;
        
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cameraView, 0, 0, canvas.width, canvas.height);
        
        cameraView.style.transition = '0.3s';
        cameraView.style.filter = 'brightness(2)';
        setTimeout(() => {
            cameraView.style.filter = 'brightness(1)';
        }, 300);
        
        currentImage = canvas.toDataURL('image/jpeg', 0.9);
        imagePreview.src = currentImage;
        imagePreview.style.display = 'block';
        cameraView.style.display = 'none';
        cameraMenu.style.display = 'none';
        mediaContainer.classList.remove('fullscreen');
        
        const containerRect = mediaContainer.getBoundingClientRect();
        const aspectRatio = videoWidth / videoHeight;
        let newWidth = containerRect.width;
        let newHeight = newWidth / aspectRatio;
        
        if (newHeight > containerRect.height) {
            newHeight = containerRect.height;
            newWidth = newHeight * aspectRatio;
        }
        
        imagePreview.style.width = `${newWidth}px`;
        imagePreview.style.height = `${newHeight}px`;
        imagePreview.style.maxWidth = '100%';
        imagePreview.style.maxHeight = '100%';
        imagePreview.style.transform = 'translate(-50%, -50%)';
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        isCameraActive = false;
        uploadBtn.disabled = false;
        addTextBtn.disabled = false;
        
        showStatus("Foto capturada. Clique em 'Enviar para o Drive'.", 'info');
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
            
            cameraView.onloadedmetadata = () => {
                cameraView.style.width = '100%';
                cameraView.style.height = '100%';
                cameraView.style.maxWidth = '100%';
                cameraView.style.maxHeight = '100%';
            };
            
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

    chooseFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

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
                
                showStatus("Imagem selecionada. Clique em 'Enviar para o Drive'.", 'info');
            };
            reader.readAsDataURL(file);
        } else {
            showError("Por favor, selecione um arquivo de imagem válido.");
        }
    });

    // ========== FUNCIONALIDADES DE FILTROS ==========
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
        let filterValue = currentFilter;
        
        if (currentFilter !== 'none') {
            filterValue = currentFilter.replace(/([\d.]+)(%|px|deg)/g, (match, number, unit) => {
                return `${parseFloat(number) * intensity}${unit}`;
            });
        }
        
        imagePreview.style.filter = filterValue;
    }

    filterIntensity.addEventListener('input', () => {
        currentFilterIntensity = filterIntensity.value;
        applyFilter();
    });

    // ========== FUNCIONALIDADE DE UPLOAD ==========
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
            
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = currentImage;
            });
            
            // Ajustar canvas para considerar devicePixelRatio
            const dpr = window.devicePixelRatio || 1;
            canvas.width = img.width * dpr;
            canvas.height = img.height * dpr;
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr); // Escalar o contexto para alta densidade
            
            // Aplicar filtro
            ctx.filter = imagePreview.style.filter || 'none';
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            const containerRect = mediaContainer.getBoundingClientRect();
            const imgPreviewRect = imagePreview.getBoundingClientRect();
            
            // Calcular escala considerando o tamanho real da imagem no canvas
            const scaleX = img.width / imgPreviewRect.width;
            const scaleY = img.height / imgPreviewRect.height;
            
            // Calcular o deslocamento da imagem dentro do container
            const offsetX = (containerRect.width - imgPreviewRect.width) / 2;
            const offsetY = (containerRect.height - imgPreviewRect.height) / 2;
            
            const textElements = document.querySelectorAll('.draggable-text');
            textElements.forEach(textElement => {
                const text = textElement.textContent;
                const color = textElement.style.color || '#000000';
                const fontSize = parseInt(textElement.style.fontSize) || 24;
                const fontFamily = textElement.style.fontFamily || 'Arial';
                const textAlign = textElement.style.textAlign || 'center';
                
                const textRect = textElement.getBoundingClientRect();
                
                // Calcular posição relativa ao container, ajustando translate(-50%, -50%)
                const relativeX = textRect.left - containerRect.left - offsetX + (textRect.width / 2);
                const relativeY = textRect.top - containerRect.top - offsetY + (textRect.height / 2);
                
                // Escalar posição para o canvas
                const x = relativeX * scaleX;
                const y = relativeY * scaleY;
                
                // Ajustar tamanho da fonte sem dupla escalagem
                const scaledFontSize = fontSize * Math.min(scaleX, scaleY) * dpr;
                
                ctx.font = `${scaledFontSize}px ${fontFamily}`;
                ctx.fillStyle = color;
                ctx.textAlign = textAlign;
                ctx.textBaseline = 'middle';

                // Aplicar transformação (escala e rotação)
                const transform = textElement.style.transform.match(/scale\(([^)]+)\)|rotate\(([^)]+)\)/g) || [];
                let scale = 1;
                let rotation = 0;
                transform.forEach(t => {
                    if (t.includes('scale')) {
                        scale = parseFloat(t.match(/scale\(([^)]+)\)/)[1]) || 1;
                    }
                    if (t.includes('rotate')) {
                        rotation = parseFloat(t.match(/rotate\(([^)]+)\)/)[1]) || 0;
                    }
                });

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.scale(scale, scale);
                ctx.fillText(text, 0, 0);
                ctx.restore();
            });
            
            const finalImage = canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = finalImage.split(',')[1];
            
            const response = await fetch(scriptUrl, {
                method: 'POST',
                body: base64Data
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Imagem enviada com sucesso como ${result.fileName}!`, 'success');
                uploadBtn.disabled = true;
                currentImage = null;
                
                setTimeout(() => {
                    resetInterface();
                }, 5000);
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

    // ========== FUNÇÕES AUXILIARES ==========
    function showStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = 'status';
        
        if (type === 'success') {
            statusDiv.classList.add('success');
        } else if (type === 'error') {
            statusDiv.classList.add('error');
        }
        
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
            updateProgress(progress);
        }, 300);
    }

    function updateProgress(percent) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
    }

    addTextBtn.disabled = true;
    uploadBtn.disabled = true;
});