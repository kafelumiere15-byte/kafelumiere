import { useEffect } from 'react'

const MetaData = ({ title }) => {
    useEffect(() => {
        document.title = `${title} - Kafé Lumière`
    }, [title])
    return null
}

export default MetaData
