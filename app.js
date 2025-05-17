// Variáveis globais
let currentPage = 'home';
let currentStoryId = null;
let currentShareToken = null;
let filePreviewList = [];
let editFilePreviewList = [];
let currentTheme = localStorage.getItem('theme') || 'light';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Aplicar tema atual
    applyTheme(currentTheme);
    
    // Configurar navegação
    setupNavigation();
    
    // Verificar se é uma página compartilhada
    const urlParams = new URLSearchParams(window.location.search);
    currentShareToken = urlParams.get('token');
    
    if (currentShareToken) {
        loadSharedStory(currentShareToken);
    } else {
        // Carregar página inicial por padrão
        navigateTo(getPageFromUrl() || 'home');
    }
    
    // Configurar eventos globais
    setupGlobalEvents();
});

// Aplicar tema (claro ou escuro)
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="bi bi-sun"></i> Alternar Modo Claro';
        }
    } else {
        document.body.removeAttribute('data-theme');
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="bi bi-moon-stars"></i> Alternar Modo Escuro';
        }
    }
}

// Configuração de navegação
function setupNavigation() {
    document.getElementById('home-link').addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('home');
    });
    
    document.getElementById('new-story-link').addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('new-story');
    });
    
    document.getElementById('categories-link').addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('categories');
    });
    
    // Configurar formulário de busca
    document.getElementById('search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const searchTerm = document.getElementById('search-input').value.trim();
        if (searchTerm) {
            navigateTo('home', { search: searchTerm });
        }
    });
    
    // Lidar com navegação do navegador
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.page) {
            navigateTo(e.state.page, e.state.params, true);
        } else {
            navigateTo('home', {}, true);
        }
    });
}

// Obter página atual da URL
function getPageFromUrl() {
    const path = window.location.pathname;
    if (path === '/') return 'home';
    if (path === '/nova-historia') return 'new-story';
    if (path === '/categorias') return 'categories';
    if (path.startsWith('/historia/')) {
        currentStoryId = path.split('/').pop();
        return 'story-detail';
    }
    if (path.startsWith('/editar/')) {
        currentStoryId = path.split('/').pop();
        return 'edit-story';
    }
    if (path.startsWith('/shared/')) {
        currentShareToken = path.split('/').pop();
        return 'shared-story';
    }
    return null;
}

// Navegação entre páginas
function navigateTo(page, params = {}, isPopState = false) {
    currentPage = page;
    
    // Atualizar URL
    let url = '/';
    if (page === 'new-story') url = '/nova-historia';
    else if (page === 'categories') url = '/categorias';
    else if (page === 'story-detail' && params.id) {
        url = `/historia/${params.id}`;
        currentStoryId = params.id;
    }
    else if (page === 'edit-story' && params.id) {
        url = `/editar/${params.id}`;
        currentStoryId = params.id;
    }
    else if (page === 'shared-story' && params.token) {
        url = `/shared/${params.token}`;
        currentShareToken = params.token;
    }
    
    if (!isPopState) {
        history.pushState({ page, params }, '', url);
    }
    
    // Carregar conteúdo da página
    loadPage(page, params);
}

// Carregar conteúdo da página
function loadPage(page, params = {}) {
    const appContainer = document.getElementById('app');
    let template;
    
    // Limpar container
    appContainer.innerHTML = '';
    
    // Carregar template apropriado
    switch (page) {
        case 'home':
            template = document.getElementById('home-template');
            appContainer.appendChild(template.content.cloneNode(true));
            loadStories(params.search, params.category);
            loadCategoriesForFilter();
            setupHomeEvents();
            break;
            
        case 'story-detail':
            template = document.getElementById('story-detail-template');
            appContainer.appendChild(template.content.cloneNode(true));
            loadStoryDetails(currentStoryId);
            setupStoryDetailEvents();
            break;
            
        case 'new-story':
            template = document.getElementById('new-story-template');
            appContainer.appendChild(template.content.cloneNode(true));
            loadCategoriesForSelect('story-category');
            setupNewStoryEvents();
            break;
            
        case 'edit-story':
            template = document.getElementById('edit-story-template');
            appContainer.appendChild(template.content.cloneNode(true));
            loadCategoriesForSelect('edit-story-category');
            loadStoryForEditing(currentStoryId);
            setupEditStoryEvents();
            break;
            
        case 'categories':
            template = document.getElementById('categories-template');
            appContainer.appendChild(template.content.cloneNode(true));
            loadCategories();
            setupCategoriesEvents();
            break;
            
        case 'shared-story':
            template = document.getElementById('shared-story-template');
            appContainer.appendChild(template.content.cloneNode(true));
            loadSharedStory(currentShareToken);
            break;
    }
}

// Carregar histórias para a página inicial
function loadStories(searchTerm = '', categoryId = '') {
    const storiesContainer = document.getElementById('stories-container');
    const noStoriesElement = document.getElementById('no-stories');
    
    // Mostrar indicador de carregamento
    storiesContainer.innerHTML = `
        <div class="col">
            <div class="card h-100 story-card">
                <div class="card-body">
                    <h5 class="card-title">Carregando histórias...</h5>
                    <p class="card-text">Por favor, aguarde enquanto carregamos suas histórias.</p>
                </div>
            </div>
        </div>
    `;
    
    // Construir URL com parâmetros de busca
    let url = '/api/stories';
    const params = [];
    if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
    if (categoryId) params.push(`category=${encodeURIComponent(categoryId)}`);
    if (params.length > 0) url += '?' + params.join('&');
    
    // Buscar histórias da API
    fetch(url)
        .then(response => response.json())
        .then(stories => {
            // Limpar container
            storiesContainer.innerHTML = '';
            
            if (stories.length === 0) {
                // Mostrar mensagem de nenhuma história
                noStoriesElement.classList.remove('d-none');
                storiesContainer.classList.add('d-none');
            } else {
                // Mostrar histórias
                noStoriesElement.classList.add('d-none');
                storiesContainer.classList.remove('d-none');
                
                stories.forEach(story => {
                    const hasAttachments = story.attachments_count > 0;
                    
                    const storyCard = document.createElement('div');
                    storyCard.className = 'col';
                    storyCard.innerHTML = `
                        <div class="card h-100 story-card">
                            <div class="card-body">
                                <h5 class="card-title">${escapeHtml(story.title)}</h5>
                                <h6 class="card-subtitle mb-2 text-muted">
                                    <span class="badge bg-secondary">${escapeHtml(story.category)}</span>
                                    <small class="ms-2">${story.created_at}</small>
                                </h6>
                                <p class="card-text">${escapeHtml(story.content)}</p>
                            </div>
                            <div class="card-footer d-flex justify-content-between align-items-center">
                                <small class="text-muted">
                                    ${hasAttachments ? `<i class="bi bi-paperclip"></i> ${story.attachments_count} anexo(s)` : ''}
                                </small>
                                <a href="#" class="btn btn-sm btn-primary view-story" data-id="${story.id}">Ver história</a>
                            </div>
                        </div>
                    `;
                    
                    storiesContainer.appendChild(storyCard);
                });
                
                // Adicionar eventos aos botões de visualização
                document.querySelectorAll('.view-story').forEach(button => {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        const storyId = button.getAttribute('data-id');
                        navigateTo('story-detail', { id: storyId });
                    });
                });
            }
        })
        .catch(error => {
            console.error('Erro ao carregar histórias:', error);
            showToast('Erro', 'Não foi possível carregar as histórias. Por favor, tente novamente.');
            
            storiesContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        Erro ao carregar histórias. Por favor, tente novamente.
                    </div>
                </div>
            `;
        });
}

// Carregar categorias para o filtro na página inicial
function loadCategoriesForFilter() {
    const categoryFilter = document.getElementById('category-filter');
    
    fetch('/api/categories')
        .then(response => response.json())
        .then(categories => {
            // Manter a opção "Todas as categorias"
            const defaultOption = categoryFilter.querySelector('option');
            categoryFilter.innerHTML = '';
            categoryFilter.appendChild(defaultOption);
            
            // Adicionar categorias
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.name} (${category.stories_count})`;
                categoryFilter.appendChild(option);
            });
            
            // Configurar evento de mudança
            categoryFilter.addEventListener('change', () => {
                const selectedCategory = categoryFilter.value;
                navigateTo('home', { category: selectedCategory });
            });
        })
        .catch(error => {
            console.error('Erro ao carregar categorias:', error);
        });
}

// Carregar categorias para selects em formulários
function loadCategoriesForSelect(selectId) {
    const categorySelect = document.getElementById(selectId);
    
    fetch('/api/categories')
        .then(response => response.json())
        .then(categories => {
            // Manter a opção padrão
            const defaultOption = categorySelect.querySelector('option');
            categorySelect.innerHTML = '';
            categorySelect.appendChild(defaultOption);
            
            // Adicionar categorias
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar categorias:', error);
            showToast('Erro', 'Não foi possível carregar as categorias. Por favor, tente novamente.');
        });
}

// Carregar detalhes de uma história
function loadStoryDetails(storyId) {
    fetch(`/api/stories/${storyId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('História não encontrada');
            }
            return response.json();
        })
        .then(story => {
            // Preencher detalhes da história
            document.querySelector('.story-title').textContent = story.title;
            document.querySelector('.category-badge').textContent = story.category_name;
            document.querySelector('.story-date').textContent = story.created_at;
            document.querySelector('.story-content').textContent = story.content;
            
            // Configurar botão de compartilhamento
            const shareButton = document.querySelector('.share-story');
            if (story.is_shared) {
                shareButton.innerHTML = '<i class="bi bi-share"></i> Gerenciar compartilhamento';
                
                // Mostrar link de compartilhamento
                const shareLinkContainer = document.querySelector('.share-link-container');
                const shareLink = document.getElementById('share-link');
                const shareUrl = `${window.location.origin}/shared/${story.share_token}`;
                
                shareLink.textContent = shareUrl;
                shareLinkContainer.classList.remove('d-none');
            } else {
                shareButton.innerHTML = '<i class="bi bi-share"></i> Compartilhar';
            }
            
            // Carregar anexos
            const attachmentsContainer = document.querySelector('.attachments-container');
            const noAttachmentsElement = document.querySelector('.no-attachments');
            
            if (story.attachments && story.attachments.length > 0) {
                attachmentsContainer.innerHTML = '';
                noAttachmentsElement.classList.add('d-none');
                
                story.attachments.forEach(attachment => {
                    const attachmentCol = document.createElement('div');
                    attachmentCol.className = 'col';
                    
                    let previewHtml = '';
                    if (attachment.file_type === 'image') {
                        previewHtml = `<img src="/api/attachments/${attachment.id}" alt="${escapeHtml(attachment.filename)}" class="img-fluid">`;
                    } else if (attachment.file_type === 'pdf') {
                        previewHtml = `<i class="bi bi-file-earmark-pdf display-4"></i>`;
                    } else if (attachment.file_type === 'document') {
                        previewHtml = `<i class="bi bi-file-earmark-text display-4"></i>`;
                    } else {
                        previewHtml = `<i class="bi bi-file-earmark display-4"></i>`;
                    }
                    
                    attachmentCol.innerHTML = `
                        <div class="card h-100 attachment-card" data-id="${attachment.id}">
                            <div class="attachment-preview d-flex align-items-center justify-content-center">
                                ${previewHtml}
                            </div>
                            <div class="card-body">
                                <p class="card-text small text-truncate">${escapeHtml(attachment.filename)}</p>
                                <small class="text-muted">${attachment.uploaded_at}</small>
                            </div>
                        </div>
                    `;
                    
                    attachmentsContainer.appendChild(attachmentCol);
                });
                
                // Adicionar eventos aos anexos
                document.querySelectorAll('.attachment-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const attachmentId = card.getAttribute('data-id');
                        window.open(`/api/attachments/${attachmentId}`, '_blank');
                    });
                });
            } else {
                noAttachmentsElement.classList.remove('d-none');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar detalhes da história:', error);
            document.querySelector('.story-title').textContent = 'Erro ao carregar história';
            document.querySelector('.story-content').innerHTML = `
                <div class="alert alert-danger">
                    Não foi possível carregar os detalhes da história. Por favor, tente novamente.
                </div>
            `;
        });
}

// Carregar história para edição
function loadStoryForEditing(storyId) {
    fetch(`/api/stories/${storyId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('História não encontrada');
            }
            return response.json();
        })
        .then(story => {
            // Preencher formulário de edição
            document.getElementById('edit-story-id').value = story.id;
            document.getElementById('edit-story-title').value = story.title;
            document.getElementById('edit-story-content').value = story.content;
            
            // Selecionar categoria
            if (story.category_id) {
                const categorySelect = document.getElementById('edit-story-category');
                for (let i = 0; i < categorySelect.options.length; i++) {
                    if (categorySelect.options[i].value == story.category_id) {
                        categorySelect.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Mostrar anexos atuais
            const currentAttachmentsContainer = document.querySelector('.current-attachments');
            const noCurrentAttachmentsElement = document.querySelector('.no-current-attachments');
            
            if (story.attachments && story.attachments.length > 0) {
                currentAttachmentsContainer.innerHTML = '';
                noCurrentAttachmentsElement.classList.add('d-none');
                
                story.attachments.forEach(attachment => {
                    const attachmentCol = document.createElement('div');
                    attachmentCol.className = 'col';
                    
                    let previewHtml = '';
                    if (attachment.file_type === 'image') {
                        previewHtml = `<img src="/api/attachments/${attachment.id}" alt="${escapeHtml(attachment.filename)}" class="img-fluid">`;
                    } else if (attachment.file_type === 'pdf') {
                        previewHtml = `<i class="bi bi-file-earmark-pdf display-4"></i>`;
                    } else if (attachment.file_type === 'document') {
                        previewHtml = `<i class="bi bi-file-earmark-text display-4"></i>`;
                    } else {
                        previewHtml = `<i class="bi bi-file-earmark display-4"></i>`;
                    }
                    
                    attachmentCol.innerHTML = `
                        <div class="card h-100">
                            <div class="attachment-preview d-flex align-items-center justify-content-center">
                                ${previewHtml}
                            </div>
                            <div class="card-body">
                                <p class="card-text small text-truncate">${escapeHtml(attachment.filename)}</p>
                                <button type="button" class="btn btn-sm btn-outline-danger delete-attachment" data-id="${attachment.id}">
                                    <i class="bi bi-trash"></i> Remover
                                </button>
                            </div>
                        </div>
                    `;
                    
                    currentAttachmentsContainer.appendChild(attachmentCol);
                });
                
                // Adicionar eventos aos botões de exclusão
                document.querySelectorAll('.delete-attachment').forEach(button => {
                    button.addEventListener('click', () => {
                        const attachmentId = button.getAttribute('data-id');
                        deleteAttachment(attachmentId, button.closest('.col'));
                    });
                });
            } else {
                noCurrentAttachmentsElement.classList.remove('d-none');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar história para edição:', error);
            showToast('Erro', 'Não foi possível carregar a história para edição. Por favor, tente novamente.');
            navigateTo('home');
        });
}

// Carregar história compartilhada
function loadSharedStory(token) {
    fetch(`/api/shared/${token}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('História compartilhada não encontrada');
            }
            return response.json();
        })
        .then(story => {
            // Preencher detalhes da história
            document.querySelector('.story-title').textContent = story.title;
            document.querySelector('.category-badge').textContent = story.category_name;
            document.querySelector('.story-date').textContent = story.created_at;
            document.querySelector('.story-content').textContent = story.content;
            
            // Carregar anexos
            const attachmentsContainer = document.querySelector('.attachments-container');
            const noAttachmentsElement = document.querySelector('.no-attachments');
            
            if (story.attachments && story.attachments.length > 0) {
                attachmentsContainer.innerHTML = '';
                noAttachmentsElement.classList.add('d-none');
                
                story.attachments.forEach(attachment => {
                    const attachmentCol = document.createElement('div');
                    attachmentCol.className = 'col';
                    
                    let previewHtml = '';
                    if (attachment.file_type === 'image') {
                        previewHtml = `<img src="/api/attachments/${attachment.id}" alt="${escapeHtml(attachment.filename)}" class="img-fluid">`;
                    } else if (attachment.file_type === 'pdf') {
                        previewHtml = `<i class="bi bi-file-earmark-pdf display-4"></i>`;
                    } else if (attachment.file_type === 'document') {
                        previewHtml = `<i class="bi bi-file-earmark-text display-4"></i>`;
                    } else {
                        previewHtml = `<i class="bi bi-file-earmark display-4"></i>`;
                    }
                    
                    attachmentCol.innerHTML = `
                        <div class="card h-100 attachment-card" data-id="${attachment.id}">
                            <div class="attachment-preview d-flex align-items-center justify-content-center">
                                ${previewHtml}
                            </div>
                            <div class="card-body">
                                <p class="card-text small text-truncate">${escapeHtml(attachment.filename)}</p>
                                <small class="text-muted">${attachment.uploaded_at}</small>
                            </div>
                        </div>
                    `;
                    
                    attachmentsContainer.appendChild(attachmentCol);
                });
                
                // Adicionar eventos aos anexos
                document.querySelectorAll('.attachment-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const attachmentId = card.getAttribute('data-id');
                        window.open(`/api/attachments/${attachmentId}`, '_blank');
                    });
                });
            } else {
                noAttachmentsElement.classList.remove('d-none');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar história compartilhada:', error);
            document.querySelector('.story-title').textContent = 'Erro ao carregar história';
            document.querySelector('.story-content').innerHTML = `
                <div class="alert alert-danger">
                    Não foi possível carregar a história compartilhada. O link pode estar expirado ou a história não está mais disponível.
                </div>
            `;
        });
}

// Carregar categorias para a página de gerenciamento
function loadCategories() {
    const categoriesTableBody = document.getElementById('categories-table-body');
    const noCategoriesElement = document.getElementById('no-categories');
    
    // Mostrar indicador de carregamento
    categoriesTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center">Carregando categorias...</td>
        </tr>
    `;
    
    fetch('/api/categories')
        .then(response => response.json())
        .then(categories => {
            if (categories.length === 0) {
                // Mostrar mensagem de nenhuma categoria
                noCategoriesElement.classList.remove('d-none');
                document.querySelector('.table').classList.add('d-none');
            } else {
                // Mostrar categorias
                noCategoriesElement.classList.add('d-none');
                document.querySelector('.table').classList.remove('d-none');
                
                categoriesTableBody.innerHTML = '';
                
                categories.forEach(category => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${escapeHtml(category.name)}</td>
                        <td>${escapeHtml(category.description || '-')}</td>
                        <td>${category.stories_count}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-category" data-id="${category.id}" data-name="${escapeHtml(category.name)}" data-description="${escapeHtml(category.description || '')}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-category" data-id="${category.id}" ${category.stories_count > 0 ? 'disabled' : ''}>
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    `;
                    
                    categoriesTableBody.appendChild(row);
                });
                
                // Adicionar eventos aos botões
                setupCategoryButtonEvents();
            }
        })
        .catch(error => {
            console.error('Erro ao carregar categorias:', error);
            categoriesTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        Erro ao carregar categorias. Por favor, tente novamente.
                    </td>
                </tr>
            `;
        });
}

// Configurar eventos para a página inicial
function setupHomeEvents() {
    // Eventos já configurados em loadStories e loadCategoriesForFilter
}

// Configurar eventos para a página de detalhes da história
function setupStoryDetailEvents() {
    // Botão de editar
    document.querySelector('.edit-story').addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('edit-story', { id: currentStoryId });
    });
    
    // Botão de compartilhar
    document.querySelector('.share-story').addEventListener('click', (e) => {
        e.preventDefault();
        toggleShareStory(currentStoryId);
    });
    
    // Botão de excluir
    document.querySelector('.delete-story').addEventListener('click', (e) => {
        e.preventDefault();
        showDeleteConfirmation(currentStoryId);
    });
    
    // Botão de copiar link
    const copyLinkButton = document.querySelector('.copy-link');
    if (copyLinkButton) {
        copyLinkButton.addEventListener('click', () => {
            const shareLink = document.getElementById('share-link').textContent;
            navigator.clipboard.writeText(shareLink)
                .then(() => {
                    showToast('Sucesso', 'Link copiado para a área de transferência!');
                })
                .catch(() => {
                    showToast('Erro', 'Não foi possível copiar o link. Por favor, copie manualmente.');
                });
        });
    }
}

// Configurar eventos para a página de nova história
function setupNewStoryEvents() {
    // Botão de nova categoria
    document.getElementById('new-category-btn').addEventListener('click', () => {
        showCategoryModal('new');
    });
    
    // Botão de cancelar
    document.getElementById('cancel-story').addEventListener('click', () => {
        navigateTo('home');
    });
    
    // Input de arquivos
    const fileInput = document.getElementById('story-files');
    fileInput.addEventListener('change', () => {
        handleFileInputChange(fileInput, '.preview-container', filePreviewList);
    });
    
    // Formulário de nova história
    const storyForm = document.getElementById('story-form');
    storyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!storyForm.checkValidity()) {
            e.stopPropagation();
            storyForm.classList.add('was-validated');
            return;
        }
        
        createStory();
    });
}

// Configurar eventos para a página de edição de história
function setupEditStoryEvents() {
    // Botões de voltar
    document.querySelectorAll('.back-to-story').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('story-detail', { id: currentStoryId });
        });
    });
    
    // Botão de nova categoria
    document.getElementById('edit-new-category-btn').addEventListener('click', () => {
        showCategoryModal('edit');
    });
    
    // Input de arquivos
    const fileInput = document.getElementById('edit-story-files');
    fileInput.addEventListener('change', () => {
        handleFileInputChange(fileInput, '.edit-preview-container', editFilePreviewList);
    });
    
    // Formulário de edição
    const editForm = document.getElementById('edit-story-form');
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!editForm.checkValidity()) {
            e.stopPropagation();
            editForm.classList.add('was-validated');
            return;
        }
        
        updateStory();
    });
}

// Configurar eventos para a página de categorias
function setupCategoriesEvents() {
    // Botão de adicionar categoria
    document.getElementById('add-category-btn').addEventListener('click', () => {
        showCategoryModal('categories');
    });
    
    // Botão de adicionar categoria (quando não há categorias)
    const noAddButton = document.getElementById('no-categories-add-btn');
    if (noAddButton) {
        noAddButton.addEventListener('click', () => {
            showCategoryModal('categories');
        });
    }
}

// Configurar eventos para botões de categoria
function setupCategoryButtonEvents() {
    // Botões de editar categoria
    document.querySelectorAll('.edit-category').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');
            const description = button.getAttribute('data-description');
            
            showCategoryModal('categories', { id, name, description });
        });
    });
    
    // Botões de excluir categoria
    document.querySelectorAll('.delete-category').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            deleteCategory(id);
        });
    });
}

// Configurar eventos globais
function setupGlobalEvents() {
    // Modal de categoria
    const categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
    
    // Botão de salvar categoria
    document.getElementById('save-category-btn').addEventListener('click', () => {
        const categoryName = document.getElementById('category-name').value.trim();
        const categoryDescription = document.getElementById('category-description').value.trim();
        const categoryId = document.getElementById('category-form').getAttribute('data-id');
        
        if (!categoryName) {
            document.getElementById('category-name').classList.add('is-invalid');
            return;
        }
        
        if (categoryId) {
            // Atualizar categoria existente
            updateCategory(categoryId, categoryName, categoryDescription);
        } else {
            // Criar nova categoria
            createCategory(categoryName, categoryDescription);
        }
        
        categoryModal.hide();
    });
    
    // Modal de confirmação de exclusão
    const confirmDeleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    
    // Botão de confirmar exclusão
    document.getElementById('confirm-delete-btn').addEventListener('click', () => {
        const storyId = document.getElementById('confirmDeleteModal').getAttribute('data-id');
        deleteStory(storyId);
        confirmDeleteModal.hide();
    });
    
    // Botão de alternar tema
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(currentTheme);
            localStorage.setItem('theme', currentTheme);
        });
    }
}

// Criar nova história
function createStory() {
    const title = document.getElementById('story-title').value.trim();
    const content = document.getElementById('story-content').value.trim();
    const categoryId = document.getElementById('story-category').value;
    
    // Criar FormData para envio de arquivos
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (categoryId) {
        formData.append('category_id', categoryId);
    }
    
    // Adicionar arquivos
    const fileInput = document.getElementById('story-files');
    if (fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files', fileInput.files[i]);
        }
    }
    
    // Enviar requisição
    fetch('/api/stories', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao criar história');
            }
            return response.json();
        })
        .then(data => {
            showToast('Sucesso', 'História criada com sucesso!');
            navigateTo('story-detail', { id: data.id });
        })
        .catch(error => {
            console.error('Erro ao criar história:', error);
            showToast('Erro', 'Não foi possível criar a história. Por favor, tente novamente.');
        });
}

// Atualizar história existente
function updateStory() {
    const storyId = document.getElementById('edit-story-id').value;
    const title = document.getElementById('edit-story-title').value.trim();
    const content = document.getElementById('edit-story-content').value.trim();
    const categoryId = document.getElementById('edit-story-category').value;
    
    // Criar FormData para envio de arquivos
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (categoryId) {
        formData.append('category_id', categoryId);
    }
    
    // Adicionar arquivos
    const fileInput = document.getElementById('edit-story-files');
    if (fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files', fileInput.files[i]);
        }
    }
    
    // Enviar requisição
    fetch(`/api/stories/${storyId}`, {
        method: 'PUT',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao atualizar história');
            }
            return response.json();
        })
        .then(() => {
            showToast('Sucesso', 'História atualizada com sucesso!');
            navigateTo('story-detail', { id: storyId });
        })
        .catch(error => {
            console.error('Erro ao atualizar história:', error);
            showToast('Erro', 'Não foi possível atualizar a história. Por favor, tente novamente.');
        });
}

// Excluir história
function deleteStory(storyId) {
    fetch(`/api/stories/${storyId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao excluir história');
            }
            return response.json();
        })
        .then(() => {
            showToast('Sucesso', 'História excluída com sucesso!');
            navigateTo('home');
        })
        .catch(error => {
            console.error('Erro ao excluir história:', error);
            showToast('Erro', 'Não foi possível excluir a história. Por favor, tente novamente.');
        });
}

// Alternar compartilhamento de história
function toggleShareStory(storyId) {
    const shareButton = document.querySelector('.share-story');
    const shareLinkContainer = document.querySelector('.share-link-container');
    
    if (shareButton.innerHTML.includes('Gerenciar')) {
        // Desativar compartilhamento
        fetch(`/api/stories/${storyId}/unshare`, {
            method: 'POST'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao desativar compartilhamento');
                }
                return response.json();
            })
            .then(() => {
                shareButton.innerHTML = '<i class="bi bi-share"></i> Compartilhar';
                shareLinkContainer.classList.add('d-none');
                showToast('Sucesso', 'Compartilhamento desativado com sucesso!');
            })
            .catch(error => {
                console.error('Erro ao desativar compartilhamento:', error);
                showToast('Erro', 'Não foi possível desativar o compartilhamento. Por favor, tente novamente.');
            });
    } else {
        // Ativar compartilhamento
        fetch(`/api/stories/${storyId}/share`, {
            method: 'POST'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao compartilhar história');
                }
                return response.json();
            })
            .then(data => {
                shareButton.innerHTML = '<i class="bi bi-share"></i> Gerenciar compartilhamento';
                
                // Mostrar link de compartilhamento
                const shareLink = document.getElementById('share-link');
                const shareUrl = `${window.location.origin}/shared/${data.share_token}`;
                
                shareLink.textContent = shareUrl;
                shareLinkContainer.classList.remove('d-none');
                
                showToast('Sucesso', 'História compartilhada com sucesso!');
            })
            .catch(error => {
                console.error('Erro ao compartilhar história:', error);
                showToast('Erro', 'Não foi possível compartilhar a história. Por favor, tente novamente.');
            });
    }
}

// Excluir anexo
function deleteAttachment(attachmentId, attachmentElement) {
    fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao excluir anexo');
            }
            return response.json();
        })
        .then(() => {
            // Remover elemento do DOM
            attachmentElement.remove();
            
            // Verificar se ainda há anexos
            const currentAttachmentsContainer = document.querySelector('.current-attachments');
            if (currentAttachmentsContainer.children.length === 0) {
                document.querySelector('.no-current-attachments').classList.remove('d-none');
            }
            
            showToast('Sucesso', 'Anexo excluído com sucesso!');
        })
        .catch(error => {
            console.error('Erro ao excluir anexo:', error);
            showToast('Erro', 'Não foi possível excluir o anexo. Por favor, tente novamente.');
        });
}

// Criar nova categoria
function createCategory(name, description) {
    fetch('/api/categories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            description: description
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao criar categoria');
            }
            return response.json();
        })
        .then(() => {
            showToast('Sucesso', 'Categoria criada com sucesso!');
            
            // Recarregar categorias dependendo da página atual
            if (currentPage === 'categories') {
                loadCategories();
            } else if (currentPage === 'new-story') {
                loadCategoriesForSelect('story-category');
            } else if (currentPage === 'edit-story') {
                loadCategoriesForSelect('edit-story-category');
            }
        })
        .catch(error => {
            console.error('Erro ao criar categoria:', error);
            showToast('Erro', 'Não foi possível criar a categoria. Por favor, tente novamente.');
        });
}

// Atualizar categoria existente
function updateCategory(id, name, description) {
    fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            description: description
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao atualizar categoria');
            }
            return response.json();
        })
        .then(() => {
            showToast('Sucesso', 'Categoria atualizada com sucesso!');
            
            // Recarregar categorias dependendo da página atual
            if (currentPage === 'categories') {
                loadCategories();
            } else if (currentPage === 'new-story') {
                loadCategoriesForSelect('story-category');
            } else if (currentPage === 'edit-story') {
                loadCategoriesForSelect('edit-story-category');
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar categoria:', error);
            showToast('Erro', 'Não foi possível atualizar a categoria. Por favor, tente novamente.');
        });
}

// Excluir categoria
function deleteCategory(id) {
    fetch(`/api/categories/${id}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao excluir categoria');
            }
            return response.json();
        })
        .then(() => {
            showToast('Sucesso', 'Categoria excluída com sucesso!');
            loadCategories();
        })
        .catch(error => {
            console.error('Erro ao excluir categoria:', error);
            showToast('Erro', 'Não foi possível excluir a categoria. Por favor, tente novamente.');
        });
}

// Mostrar modal de categoria
function showCategoryModal(source, category = null) {
    const categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
    const categoryForm = document.getElementById('category-form');
    const categoryNameInput = document.getElementById('category-name');
    const categoryDescriptionInput = document.getElementById('category-description');
    const modalTitle = document.querySelector('#categoryModal .modal-title');
    
    // Limpar formulário
    categoryForm.reset();
    categoryForm.removeAttribute('data-id');
    
    if (category) {
        // Edição de categoria existente
        modalTitle.textContent = 'Editar Categoria';
        categoryNameInput.value = category.name;
        categoryDescriptionInput.value = category.description;
        categoryForm.setAttribute('data-id', category.id);
    } else {
        // Nova categoria
        modalTitle.textContent = 'Nova Categoria';
    }
    
    // Armazenar origem para recarregar categorias após salvar
    categoryForm.setAttribute('data-source', source);
    
    categoryModal.show();
}

// Mostrar confirmação de exclusão
function showDeleteConfirmation(storyId) {
    const confirmDeleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    document.getElementById('confirmDeleteModal').setAttribute('data-id', storyId);
    confirmDeleteModal.show();
}

// Lidar com mudança no input de arquivos
function handleFileInputChange(fileInput, containerSelector, previewList) {
    const previewContainer = document.querySelector(containerSelector);
    previewContainer.innerHTML = '';
    previewList = [];
    
    if (fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'col preview-item';
                
                let previewContent = '';
                if (file.type.startsWith('image/')) {
                    previewContent = `<img src="${e.target.result}" class="img-fluid" alt="Preview">`;
                } else if (file.type === 'application/pdf') {
                    previewContent = `<div class="p-3 bg-light text-center"><i class="bi bi-file-earmark-pdf display-4"></i><p class="mt-2">${file.name}</p></div>`;
                } else {
                    previewContent = `<div class="p-3 bg-light text-center"><i class="bi bi-file-earmark display-4"></i><p class="mt-2">${file.name}</p></div>`;
                }
                
                previewItem.innerHTML = `
                    <div class="card h-100">
                        <div class="attachment-preview">
                            ${previewContent}
                        </div>
                        <div class="card-body">
                            <p class="card-text small text-truncate">${file.name}</p>
                            <small class="text-muted">${formatFileSize(file.size)}</small>
                        </div>
                        <div class="remove-preview">
                            <i class="bi bi-x"></i>
                        </div>
                    </div>
                `;
                
                previewContainer.appendChild(previewItem);
                
                // Adicionar evento para remover preview
                const removeButton = previewItem.querySelector('.remove-preview');
                removeButton.addEventListener('click', () => {
                    previewItem.remove();
                });
                
                previewList.push({
                    file: file,
                    element: previewItem
                });
            };
            
            reader.readAsDataURL(file);
        }
    }
}

// Formatar tamanho de arquivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Mostrar toast de notificação
function showToast(title, message) {
    const toastElement = document.getElementById('toast');
    const toast = new bootstrap.Toast(toastElement);
    
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-message').textContent = message;
    
    toast.show();
}

// Função para escapar HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
