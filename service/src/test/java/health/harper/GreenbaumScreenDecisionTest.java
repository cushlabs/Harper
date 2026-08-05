package health.harper;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

/**
 * Unit tests for the Greenbaum screen DMN (endpoint POST /GreenbaumScreen).
 *
 * Positive when >= 2 of the six items are positive (the partner item counts when > 5).
 *
 * The significant-trauma item is answered by two subquestions: 1a broken bones / cuts
 * needing stitches, and 1b knocked unconscious. The model publishes both scorings:
 *
 *   atRisk                -- MODIFIED tool: 1b only. Harper acts on this.
 *   atRiskOriginalScreen  -- ORIGINAL screen: 1a or 1b, counted once. Comparison only.
 *
 * The multi-site evaluation found the modified tool raises ED specificity from ~49.4%
 * to ~59.5% with sensitivity unchanged, which is why the process binds atRisk.
 *
 * EVERY input is required on every call. Kogito raises a DMN error (HTTP 500) for an
 * input missing from the request context, so the helper below always sends all seven.
 */
@QuarkusTest
class GreenbaumScreenDecisionTest {

    private static final String CT = "application/json";
    private static final String MODIFIED = "atRisk";
    private static final String ORIGINAL = "atRiskOriginalScreen";

    /** All six items negative and partners 0, unless overridden. Always complete. */
    private static String body(String... overrides) {
        StringBuilder sb = new StringBuilder("{")
            .append("\"historyOfBrokenBonesOrCuts\": false,")
            .append("\"historyOfKnockedUnconscious\": false,")
            .append("\"historyOfRunningAway\": false,")
            .append("\"historyOfAlcoholOrDrugAbuse\": false,")
            .append("\"everInvolvedWithLawEnforcement\": false,")
            .append("\"historyOfSTD\": false,")
            .append("\"numberOfSexualPartners\": 0");
        for (String o : overrides) sb.append(",").append(o);
        return sb.append("}").toString();
    }

    private static void assertScreen(String json, String decision, boolean expected) {
        given().contentType(CT).body(json)
            .when().post("/GreenbaumScreen")
            .then().statusCode(200)
            .body(decision, is(expected));
    }

    // ---- cutoff behaviour (modified tool = what Harper acts on) --------------

    @Test
    void twoOrMorePositive_isAtRisk() {
        assertScreen(body("\"historyOfKnockedUnconscious\": true",
                          "\"historyOfAlcoholOrDrugAbuse\": true"), MODIFIED, true);
    }

    @Test
    void singlePositive_isNotAtRisk() {
        assertScreen(body("\"historyOfKnockedUnconscious\": true"), MODIFIED, false);
    }

    @Test
    void nonePositive_isNotAtRisk() {
        assertScreen(body(), MODIFIED, false);
    }

    // ---- partner item -------------------------------------------------------

    @Test
    void moreThanFivePartnersPlusOneItem_isAtRisk() {
        assertScreen(body("\"historyOfKnockedUnconscious\": true",
                          "\"numberOfSexualPartners\": 6"), MODIFIED, true);
    }

    @Test
    void exactlyFivePartners_doesNotCount() {
        assertScreen(body("\"historyOfKnockedUnconscious\": true",
                          "\"numberOfSexualPartners\": 5"), MODIFIED, false);
    }

    // ---- the 1a subquestion: where the two variants diverge ------------------

    /** Modified tool ignores 1a, so 1a + one other item stays below the cutoff. */
    @Test
    void modifiedTool_brokenBonesDoesNotScore() {
        assertScreen(body("\"historyOfBrokenBonesOrCuts\": true",
                          "\"historyOfAlcoholOrDrugAbuse\": true"), MODIFIED, false);
    }

    /** Same answers under the original screen: 1a scores, so the cutoff is met. */
    @Test
    void originalScreen_brokenBonesScores() {
        assertScreen(body("\"historyOfBrokenBonesOrCuts\": true",
                          "\"historyOfAlcoholOrDrugAbuse\": true"), ORIGINAL, true);
    }

    /** Under the original screen 1a and 1b together still count once, not twice. */
    @Test
    void originalScreen_bothSubquestionsCountOnce() {
        assertScreen(body("\"historyOfBrokenBonesOrCuts\": true",
                          "\"historyOfKnockedUnconscious\": true"), ORIGINAL, false);
    }

    /** 1b scores under both variants. */
    @Test
    void modifiedTool_knockedUnconsciousStillScores() {
        assertScreen(body("\"historyOfKnockedUnconscious\": true",
                          "\"historyOfRunningAway\": true"), MODIFIED, true);
    }

    /** Both decisions are returned from one call, and can legitimately disagree. */
    @Test
    void bothDecisionsReturned_andMayDisagree() {
        String json = body("\"historyOfBrokenBonesOrCuts\": true",
                           "\"historyOfAlcoholOrDrugAbuse\": true");
        assertScreen(json, MODIFIED, false);
        assertScreen(json, ORIGINAL, true);
    }

    /** The modified tool can never fire where the original does not: it drops a contributor. */
    @Test
    void modifiedNeverFiresWhereOriginalDoesNot() {
        String json = body("\"historyOfKnockedUnconscious\": true",
                           "\"historyOfRunningAway\": true");
        assertScreen(json, MODIFIED, true);
        assertScreen(json, ORIGINAL, true);
    }
}
