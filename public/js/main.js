document.addEventListener('DOMContentLoaded', function() {
    const formsWithLoading = document.querySelectorAll('form.needs-loading');
    formsWithLoading.forEach(form => {
        form.addEventListener('submit', function(event) {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton && !submitButton.disabled) {
                const originalButtonText = submitButton.innerHTML;
                submitButton.disabled = true;
                submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...`;

                form.dataset.originalButtonText = originalButtonText;
            }
        });
    });

    window.resetSubmitButton = function(formElement) {
        if (formElement && formElement.dataset.originalButtonText) {
            const submitButton = formElement.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = formElement.dataset.originalButtonText;
            }
        }
    };


    const quickViewModalElement = document.getElementById('quickViewModal');
    if (quickViewModalElement) {
        const quickViewModal = new bootstrap.Modal(quickViewModalElement);
        const modalBody = document.getElementById('quickViewModalBody');
        const modalTitle = document.getElementById('quickViewModalLabel');
        const modalDetailLink = document.getElementById('quickViewModalDetailLink');

        document.querySelectorAll('.quick-view-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const scId = this.dataset.scId;
                if (!scId) return;

                modalTitle.textContent = 'Memuat...';
                modalBody.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Memuat detail source code...</p></div>`;
                modalDetailLink.href = `/sc/${scId}`;
                quickViewModal.show();

                try {
                    const response = await fetch(`/api/sc/${scId}/quick-view`);
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ message: 'Gagal mengambil data.' }));
                        throw new Error(errorData.message || 'Network response was not ok.');
                    }
                    const data = await response.json();
                    
                    modalTitle.textContent = data.title;
                    modalBody.innerHTML = `
                        <div class="row">
                            <div class="col-md-5 mb-3 mb-md-0">
                                <img src="${data.image}" class="img-fluid rounded border shadow-sm" alt="${data.title}" style="max-height: 250px; width: 100%; object-fit: cover;">
                            </div>
                            <div class="col-md-7">
                                <p class="badge bg-info-subtle text-info-emphasis border border-info-subtle mb-2">${data.category}</p>
                                <p class="mb-2">${data.description_short}</p>
                                ${data.price_display ? `<h4 class="text-primary fw-bold mt-2">${data.price_display}</h4>` : ''}
                                <a href="/sc/${data.id}" class="btn btn-outline-primary btn-sm mt-3"><i class="fas fa-info-circle me-1"></i> Detail Lengkap</a>
                            </div>
                        </div>
                    `;
                } catch (error) {
                    console.error('Quick view error:', error);
                    modalTitle.textContent = 'Gagal Memuat';
                    modalBody.innerHTML = `<p class="text-danger">Tidak dapat memuat detail source code saat ini. Error: ${error.message}</p>`;
                }
            });
        });
    }

    const toastElList = [].slice.call(document.querySelectorAll('.toast'))
    const toastList = toastElList.map(function (toastEl) {
      return new bootstrap.Toast(toastEl, { delay: 5000 })
    });
    toastList.forEach(toast => toast.show());


    // Bootstrap form validation (standard)
    const formsToValidate = document.querySelectorAll('.needs-validation');
    Array.from(formsToValidate).forEach(form => {
        form.addEventListener('submit', event => {
            let customValid = true;
             // Custom validation for rental options if present
            if (form.querySelector('input[name="orderType"][value="rent"]')) {
                const rentalOptionsRadios = form.querySelectorAll('input[name="rentalOptionIndex"]');
                const isOneRentalChecked = Array.from(rentalOptionsRadios).some(radio => radio.checked);
                const rentalErrorDiv = form.querySelector('#rentalOptionError'); // Specific error div for rental
                
                if (!isOneRentalChecked && rentalOptionsRadios.length > 0) {
                    customValid = false;
                    if(rentalErrorDiv) rentalErrorDiv.style.display = 'block';
                } else {
                    if(rentalErrorDiv) rentalErrorDiv.style.display = 'none';
                }
            }

            if (!form.checkValidity() || !customValid) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

});