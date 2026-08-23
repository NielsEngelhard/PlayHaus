import AppText from "@/components/text/AppText";

/**
 * The quiz itself, once a table has been seated.
 *
 * A placeholder on purpose. The session behind this route already exists and is fully
 * dealt — `GET /api/v1/pubquizr/single-device/{sessionID}` answers with every player,
 * every question and whose turn it is to read — so this screen is the only part of the
 * one-device flow still to be written.
 */
export default function OneDeviceQuizPage() {
    return (
        <AppText>WIP</AppText>
    )
}
