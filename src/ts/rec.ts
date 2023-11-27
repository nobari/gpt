export function setRecorder() {
  const recordButton = document.getElementById('recordButton')!
  const audioPlayback = document.getElementById(
    'audioPlayback'
  ) as HTMLAudioElement
  let mediaRecorder: MediaRecorder | undefined
  let audioChunks: BlobPart[] = []
  let isRecording = false

  function startRecording(stream: MediaStream) {
    mediaRecorder = new MediaRecorder(stream)
    if (!mediaRecorder) {
      alert('MediaRecorder is not defined')
      return
    }
    mediaRecorder.start()
    recordButton.textContent = 'Recording...'
    recordButton.classList.add('btn-success')
    recordButton.classList.remove('btn-danger')

    mediaRecorder.addEventListener('dataavailable', (event) => {
      audioChunks.push(event.data)
    })

    mediaRecorder.addEventListener('stop', () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(audioBlob)
      const audioFile = new File([audioBlob], 'filename.wav', {
        type: 'audio/wav'
      })
      // Dispatch the custom 'recorded' event with the audio URL
      const recordedEvent = new CustomEvent('recorded', {
        detail: { audioUrl, audioFile }
      })
      document.dispatchEvent(recordedEvent)
      audioPlayback.src = audioUrl

      audioPlayback.classList.remove('d-none')
      audioChunks = []
      recordButton.textContent = 'Hold to Record'
      recordButton.classList.add('btn-danger')
      recordButton.classList.remove('btn-success')
    })
  }

  function stopRecording() {
    mediaRecorder!.stop()
  }

  recordButton.addEventListener('mousedown', function () {
    if (!isRecording) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(startRecording)
        .catch((error) => {
          console.error('Error accessing the microphone', error)
        })
      isRecording = true
    }
  })

  recordButton.addEventListener('mouseup', function () {
    if (isRecording) {
      stopRecording()
      isRecording = false
    }
  })

  // For touch devices
  recordButton.addEventListener('touchstart', function (e) {
    e.preventDefault()
    recordButton.dispatchEvent(new Event('mousedown'))
  })

  recordButton.addEventListener('touchend', function (e) {
    e.preventDefault()
    recordButton.dispatchEvent(new Event('mouseup'))
  })
}
